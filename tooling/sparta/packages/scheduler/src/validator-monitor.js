const { logger, CHANNELS } = require("@sparta/utils");
const { l2InfoService } = require("@sparta/ethereum");
const { clientPromise } = require("@sparta/utils/openapi/api/axios");

/**
 * Service to monitor validator status and alert operators. 
 */
class ValidatorMonitorService {
    constructor(client, recipient, summaryChannel) {
        this.client = client;
        // If recipient is provided, all DMs for individual validator alerts go to this recipient.
        // If null/undefined (default), DMs go to the validator's actual operator.
        this.dmOverrideRecipient = recipient; 

        // The Discord Channel ID where the summary report thread will be created.
        // Defaults to the production MOD_BOT channel if not specified.
        this.summaryChannelId = summaryChannel || CHANNELS.MOD_BOT?.id;

        if (!this.summaryChannelId) {
            logger.warn("ValidatorMonitorService: summaryChannelId is not configured (CHANNELS.MOD_BOT.id missing from defaults or no explicit summaryChannel provided).");
        }
        
        // Channel ID for the "operators start here" link in DM messages.
        this.operatorsStartHereChannelId = CHANNELS.OPERATORS_START_HERE?.id || 'default-operators-channel-id';
    }
    
    static async new(recipient, summaryChannel) {
        const client = await clientPromise;
        return new ValidatorMonitorService(client, recipient, summaryChannel);
    }

    /**
     * Check a single validator's status and send alerts if needed
     * @param {string} validator - Validator address
     * @param {Array} activeValidators - List of active validators
     * @param {Object} allValidatorStats - Pre-fetched stats for all validators
     */
    async processValidator(validator, activeValidators, allValidatorStats) {
        try {
            const isInValidatorSet = activeValidators.includes(validator);

            if (isInValidatorSet) {
                const validatorStats = allValidatorStats[validator.toLowerCase()];
                if (validatorStats && validatorStats.totalSlots && validatorStats.missedAttestationsCount !== undefined) {
                    const missPercent = (validatorStats.missedAttestationsCount / validatorStats.totalSlots) * 100;
                    if (missPercent < 20) return null; 
                } else {
                    return null; // No stats, assume working or cannot determine
                }
            }
            
            const { data: { data: validatorData } } = await this.client.getValidator({ address: validator });

            if (!validatorData || !validatorData.operator?.discordUsername) {
                logger.warn(`No operator info (discordUsername) found for validator ${validator}`);
                return null;
            }
            
            let missPercentage = "N/A";
            let alertReason = "";
            if (!isInValidatorSet) {
                alertReason = "not in active validator set";
            } else {
                const stats = allValidatorStats[validator.toLowerCase()];
                if (stats && stats.totalSlots && stats.missedAttestationsCount !== undefined) {
                    missPercentage = ((stats.missedAttestationsCount / stats.totalSlots) * 100).toFixed(2) + "%";
                    alertReason = `missing attestations (${missPercentage})`;
                } else {
                     alertReason = "missing attestations (stats unavailable)";
                }
            }
            
            const messageContent = `**Validator Alert**\n\nHello ${validatorData.operator?.discordUsername},\n\n` +
                `Your validator ${validator} is ${alertReason}. Please check your node status.\n\n` +
                `If you need assistance, please reach out in the <#${this.operatorsStartHereChannelId}> channel.`;
            
            let dmSent = false;
            let error = null;
            let recipient = null;
            
            if (!process.env.SKIP_MSG) { 
                try {
                    recipient = this.dmOverrideRecipient ? this.dmOverrideRecipient : validatorData.operator?.discordUsername;
                    logger.info({ recipient }, "Recipient for DM");
                    const response = await this.client.sendMessageToOperator(
                        { discordUsername: recipient },
                        { 
                            message: messageContent, 
                            validatorAddress: validator, 
                            threadName: "Validator Monitoring Alert" 
                        }
                    );
                    dmSent = response.data.success;
                    if (dmSent) {
                        logger.info(`Alert DM sent to ${recipient} for validator ${validatorData.operator?.discordUsername} with address ${validator}`);
                    } else {
                        error = response.data.error || "API call to send DM returned false";
                        logger.warn(`Failed to send DM to ${recipient} for ${validator}: ${error}`);
                    }
                } catch (dmError) {
                    error = dmError.message;
                    logger.error(`Error sending DM for validator ${validatorData.operator?.discordUsername} with address ${validator} to ${recipient}: ${error}`);
                }
            }
            
            return {
                validatorAddress: validator,
                operatorDiscordUsername: validatorData.operator?.discordUsername, 
                messageContent: messageContent,
                missPercentage: missPercentage,
                timestamp: new Date().toISOString(),
                dmSent: dmSent,
                error: error
            };
        } catch (error) {
            logger.error(`Error processing validator ${validator}: ${error.message}`);
            return null; // Or return a report with the error
        }
    }

    /**
     * Monitor all validators and report issues
     */
    async monitorValidators() {
        try {
            logger.info("Fetching validators to monitor...");
            
            const response = await this.client.getAllValidators(); 
            const validatorsData = response?.data?.data;

            let allKnownValidators = [];
            if (validatorsData && validatorsData.knownValidators && Array.isArray(validatorsData.knownValidators.validators)) {
                allKnownValidators = validatorsData.knownValidators.validators;
            } else {
                logger.warn("Could not retrieve known validators list or list is not in expected format.", validatorsData);
            }

            if (allKnownValidators.length === 0) {
                logger.info("No known validators to monitor.");
                return []; // No validators to process
            }
            
            logger.info(`Found ${allKnownValidators.length} total known validators to check.`);
            
            // Fetch all validator stats at once for efficiency
            logger.info("Fetching stats for all validators...");
            const allValidatorStats = await l2InfoService.fetchValidatorStats(); // No targetAddress - gets all stats
            logger.info(`Retrieved stats for ${Object.keys(allValidatorStats).length} validators from RPC.`);
            
            const reports = [];
            const results = await Promise.allSettled(
                allKnownValidators.map(validator => this.processValidator(validator, allKnownValidators, allValidatorStats))
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) reports.push(result.value);
                else if (result.status === 'rejected') logger.error(`Promise rejected during validator processing: ${result.reason}`);
            });
            
            if (!process.env.SKIP_MSG) {
                if (reports.length > 0) {
                    await this.sendSummaryReport(reports);
                }
            }

            logger.info(`Validator monitoring completed. Generated ${reports.length} alert reports.`);
            return reports;
        } catch (error) {
            // logger.error(`Critical error in monitorValidators: ${error.message}`);
            return error; // Return empty if monitor fails critically
        }
    }

    /**
     * Send a summary report to the mod-bot channel using webhook service
     * Splits large reports into multiple messages to avoid Discord's character limit
     */
    async sendSummaryReport(reports) {
        if (!this.summaryChannelId) {
            logger.error(`Summary report not sent: summaryChannelId is not configured.`);
            return;
        }

        try {
            const MAX_MESSAGE_LENGTH = 1500; // Stay under Discord's 4000 limit with buffer
            
            // Calculate base header info
            const timestamp = new Date().toISOString();
            const totalAlertsLine = `**Total Alerts:** ${reports.length}\n\n`;
            
            // Pre-calculate each report line to know exact sizes
            const reportLines = reports.map(report => {
                const operatorName = report.operatorDiscordUsername === "N/A" ? (report.operatorId || "Unknown") : report.operatorDiscordUsername;
                const status = report.messageContent.includes('not in active validator set') ? 
                    'Not in validator set' : `Missing attestations (${report.missPercentage})`;
                const result = report.dmSent ? 'Alert sent' : `Alert failed: ${report.error ? String(report.error).substring(0, 100) : 'Unknown'}`;
                
                return `- **${report.validatorAddress}** (${operatorName}): ${status} - ${result}\n`;
            });
            
            // Split into pages
            const pages = [];
            let currentPageLines = [];
            let currentPageSize = 0;
            
            for (const line of reportLines) {
                const lineLength = line.length;
                
                // Calculate what the header size would be for this page
                const pageNumber = pages.length + 1;
                const headerSize = pages.length > 0 || reportLines.length > 20 ? // Estimate if we'll need multiple pages
                    `# Validator Alert Summary (Page ${pageNumber}/X)\n\n**Time:** ${timestamp}\n${totalAlertsLine}`.length :
                    `# Validator Alert Summary\n\n**Time:** ${timestamp}\n${totalAlertsLine}`.length;
                
                // If adding this line would exceed the limit, start a new page
                if (currentPageLines.length > 0 && (headerSize + currentPageSize + lineLength) > MAX_MESSAGE_LENGTH) {
                    pages.push([...currentPageLines]);
                    currentPageLines = [line];
                    currentPageSize = lineLength;
                } else {
                    currentPageLines.push(line);
                    currentPageSize += lineLength;
                }
            }
            
            // Add the last page if it has content
            if (currentPageLines.length > 0) {
                pages.push(currentPageLines);
            }
            
            // If no pages were created (empty reports), create one empty page
            if (pages.length === 0) {
                pages.push([]);
            }
            
            // Send each page
            for (let i = 0; i < pages.length; i++) {
                const pageNumber = i + 1;
                const totalPages = pages.length;
                
                // Build the message for this page
                let messageContent = totalPages > 1 ? 
                    `# Validator Alert Summary (Page ${pageNumber}/${totalPages})\n\n` :
                    `# Validator Alert Summary\n\n`;
                    
                messageContent += `**Time:** ${timestamp}\n`;
                messageContent += totalAlertsLine;
                messageContent += pages[i].join('');
                
                // If this is the last page and there are multiple pages, add a footer
                if (totalPages > 1 && pageNumber === totalPages) {
                    messageContent += `\n*End of summary (${totalPages} pages total)*`;
                }
                
                const summaryPostResponse = await this.client.sendMessageToChannel(
                    null,
                    {
                        message: messageContent,
                        channelId: this.summaryChannelId
                    }
                );

                if (summaryPostResponse.data && summaryPostResponse.data.success) {
                    if (totalPages > 1) {
                        logger.info(`Sent summary report page ${pageNumber}/${totalPages} to channel ${this.summaryChannelId}.`);
                    } else {
                        logger.info(`Sent summary report to channel ${this.summaryChannelId}.`);
                    }
                } else {
                    const errorMsg = totalPages > 1 ? 
                        `Failed to send summary report page ${pageNumber}/${totalPages}` :
                        `Failed to send summary report`;
                    logger.error(`${errorMsg} to channel ${this.summaryChannelId}: ${summaryPostResponse.data?.error || 'Unknown error from API'}`);
                }
                
                // Add a small delay between messages to avoid rate limiting
                if (i < pages.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
        } catch (error) {
            console.log(error);
            logger.error(`Error sending summary report to channel ${this.summaryChannelId}: ${error.message}`);
        }
    }
}

module.exports = { ValidatorMonitorService }; 