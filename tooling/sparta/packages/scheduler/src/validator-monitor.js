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
     */
    async processValidator(validator, activeValidators) {
        try {
            const isInValidatorSet = activeValidators.includes(validator);
            
            if (isInValidatorSet) {
                const validatorStats = await l2InfoService.fetchValidatorStats(validator);
                if (validatorStats.totalSlots && validatorStats.missedAttestationsCount !== undefined) {
                    const missPercent = (validatorStats.missedAttestationsCount / validatorStats.totalSlots) * 100;
                    if (missPercent < 20) return null; 
                } else {
                    return null; // No stats, assume working or cannot determine
                }
            }
            
            const { data: { data: validatorData } } = await this.client.getValidator(validator);

            if (!validatorData || !validatorData.operatorInfo?.discordUsername) {
                logger.warn(`No operator info (discordUsername) found for validator ${validator}`);
                return null;
            }
            
            let missPercentage = "N/A";
            let alertReason = "";
            if (!isInValidatorSet) {
                alertReason = "not in active validator set";
            } else {
                const stats = await l2InfoService.fetchValidatorStats(validator);
                if (stats.totalSlots && stats.missedAttestationsCount !== undefined) {
                    missPercentage = ((stats.missedAttestationsCount / stats.totalSlots) * 100).toFixed(2) + "%";
                    alertReason = `missing attestations (${missPercentage})`;
                } else {
                     alertReason = "missing attestations (stats unavailable)";
                }
            }
            
            const messageContent = `**Validator Alert**\n\nHello ${validatorData.operatorInfo?.discordUsername},\n\n` +
                `Your validator ${validator} is ${alertReason}. Please check your node status.\n\n` +
                `If you need assistance, please reach out in the <#${this.operatorsStartHereChannelId}> channel.`;
            
            let dmSent = false;
            let error = null;
            let recipient = null;
            
            try {
                recipient = this.dmOverrideRecipient ? this.dmOverrideRecipient : validatorData.operatorInfo?.discordUsername;
                logger.info({ recipient }, "Recipient for DM");
                const response = await this.client.post("/api/operator/message", 
                    { message: messageContent, validatorAddress: validator, threadName: "Validator Monitoring Alert" }, 
                    { params: { discordUsername: recipient } }
                );
                dmSent = response.data.success;
                if (dmSent) {
                    logger.info(`Alert DM sent to ${recipient} for validator ${validatorData.operatorInfo?.discordUsername} with address ${validator}`);
                } else {
                    error = response.data.error || "API call to send DM returned false";
                    logger.warn(`Failed to send DM to ${recipient} for ${validator}: ${error}`);
                }
            } catch (dmError) {
                error = dmError.message;
                logger.error(`Error sending DM for validator ${validatorData.operatorInfo?.discordUsername} with address ${validator} to ${recipient}: ${error}`);
            }
            
            return {
                validatorAddress: validator,
                operatorDiscordUsername: validatorData.operatorInfo?.discordUsername, 
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
            
            // Call API to get all validators - assuming no pagination as per new Swagger
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
            
            const reports = [];
            const results = await Promise.allSettled(
                allKnownValidators.map(validator => this.processValidator(validator, allKnownValidators))
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) reports.push(result.value);
                else if (result.status === 'rejected') logger.error(`Promise rejected during validator processing: ${result.reason}`);
            });
            
            if (reports.length > 0) {
                await this.sendSummaryReport(reports);
            }
            
            logger.info(`Validator monitoring completed. Generated ${reports.length} alert reports.`);
            return reports;
        } catch (error) {
            logger.error(`Critical error in monitorValidators: ${error.message}`);
            return []; // Return empty if monitor fails critically
        }
    }

    /**
     * Send a summary report to the mod-bot channel using webhook service
     */
    async sendSummaryReport(reports) {
        if (!this.summaryChannelId) {
            logger.error(`Summary report not sent: summaryChannelId is not configured.`);
            return;
        }

        try {
            let messageContent = "# Validator Alert Summary\n\n";
            messageContent += `**Time:** ${new Date().toISOString()}\n`;
            messageContent += `**Total Alerts:** ${reports.length}\n\n`;
            reports.forEach(report => {
                messageContent += `- **${report.validatorAddress}** (${report.operatorDiscordUsername === "N/A" ? report.operatorId : report.operatorDiscordUsername}): `;
                messageContent += report.messageContent.includes('not in active validator set') ? 
                    'Not in validator set' : `Missing attestations (${report.missPercentage})`;
                messageContent += report.dmSent ? ' - Alert sent' : ` - Alert failed: ${report.error ? String(report.error).substring(0, 100) : 'Unknown'}`;
                messageContent += '\n';
            });
            
            // Use the new /api/moderator/message endpoint
            const summaryPostResponse = await this.client.post("/api/moderator/message", 
                {
                    message: messageContent,
                    channelId: this.summaryChannelId
                }
                // No params needed in query for this new endpoint
            );

            // Assuming the response structure for success is { data: { success: true } } or similar
            // Adjust based on actual response from your new moderator message endpoint
            if (summaryPostResponse.data && summaryPostResponse.data.success) {
                logger.info(`Sent summary report to channel ${this.summaryChannelId}.`);
            } else {
                logger.error(`Failed to send summary report to channel ${this.summaryChannelId}: ${summaryPostResponse.data?.error || 'Unknown error from API'}`);
            }
        } catch (error) {
            logger.error(`Error sending summary report to channel ${this.summaryChannelId}: ${error.message}`);
        }
    }
}

module.exports = { ValidatorMonitorService }; 