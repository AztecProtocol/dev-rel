const { logger, CHANNELS } = require("@sparta/utils");
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
     * @param {Object} validator - Validator object from API
     */
    async processValidator(validator) {
        try {
            // validator.operatorId is the Discord ID from getAllValidators response
            if (!validator.operatorId) {
                logger.warn(`No operatorId found for validator ${validator.address}`);
                return null;
            }

            // Fetch full operator details to get address and potentially a username
            let operatorDetailsFromApi;
            try {
                const operatorResponse = await this.client.getOperatorBySocials({ discordId: validator.operatorId });
                operatorDetailsFromApi = operatorResponse.data; // This should be the NodeOperator object
            } catch (fetchError) {
                logger.error(`Failed to fetch operator details for discordId ${validator.operatorId}: ${fetchError.message}`);
                return null; // Cannot proceed without operator details
            }

            if (!operatorDetailsFromApi || !operatorDetailsFromApi.address) {
                logger.warn(`Operator details or address not found for discordId ${validator.operatorId}`);
                return null;
            }

            // Prefer discordId from operatorDetails for greeting, fallback or make generic if needed
            const operatorDisplayName = operatorDetailsFromApi.discordId || "Operator"; 

            let missPercentage = "N/A";
            let alertReason = "";
            
            if (!validator.hasAttested24h) {
                alertReason = "not attesting in the last 24 hours";
            } else if (validator.totalSlots && validator.missedAttestationsCount !== undefined) {
                const missPercent = (validator.missedAttestationsCount / validator.totalSlots) * 100;
                if (missPercent < 20) {
                    return null; // Under 20% miss rate, no alert needed
                }
                missPercentage = missPercent.toFixed(2) + "%";
                alertReason = `missing attestations (${missPercentage})`;
            } else {
                alertReason = "missing attestations (stats unavailable)";
            }
            
            const messageContent = `**Validator Alert**\n\nHello ${operatorDisplayName},\n\n` +
                `Your validator ${validator.address} is ${alertReason}. Please check your node status.\n\n` +
                `If you need assistance, please reach out in the <#${this.operatorsStartHereChannelId}> channel.`;
            
            let dmSent = false;
            let error = null;
            // recipient for sendMessageToOperator is now operatorDetailsFromApi.address
            // The old 'recipient' variable logic based on discordUsername or override is less relevant here
            // as sendMessageToOperator takes address.

            if (!process.env.SKIP_MSG) { 
                try {
                    // Determine the actual Discord user to DM (for logging/override purposes)
                    // The API will use the discordId linked to operatorDetailsFromApi.address
                    const targetDiscordIdForDm = this.dmOverrideRecipient || operatorDetailsFromApi.discordId; 
                    
                    logger.info({ operatorAddress: operatorDetailsFromApi.address, targetDiscordIdForDm }, "Attempting to send DM for validator alert.");

                    const response = await this.client.sendMessageToOperator(
                        { address: operatorDetailsFromApi.address }, // Use the fetched operator's address
                        { 
                            message: messageContent, 
                            validatorAddress: validator.address, // This context might be useful for the message template if API supports it
                            threadName: "Validator Monitoring Alert" 
                        }
                    );
                    dmSent = response.data.success;
                    if (dmSent) {
                        logger.info(`Alert DM sent to operator via address ${operatorDetailsFromApi.address} (Discord ID: ${targetDiscordIdForDm}) for validator ${validator.address}`);
                    } else {
                        error = response.data.error || "API call to send DM returned false";
                        logger.warn(`Failed to send DM to operator via address ${operatorDetailsFromApi.address} (Discord ID: ${targetDiscordIdForDm}) for ${validator.address}: ${error}`);
                    }
                } catch (dmError) {
                    error = `DM API call failed: ${dmError.message}`;
                    logger.error(`Error sending DM for operator via address ${operatorDetailsFromApi.address} (Discord ID: ${operatorDetailsFromApi.discordId || 'unknown'}) for validator ${validator.address}: ${error}`, {
                        status: dmError.response?.status,
                        statusText: dmError.response?.statusText,
                        endpoint: 'sendMessageToOperator',
                        validatorAddress: validator.address,
                        operatorAddress: operatorDetailsFromApi.address,
                        discordId: operatorDetailsFromApi.discordId
                    });
                }
            }
            
            return {
                validatorAddress: validator.address,
                operatorDiscordUsername: operatorDisplayName, // Use the display name used in DM
                messageContent: messageContent,
                missPercentage: missPercentage,
                timestamp: new Date().toISOString(),
                dmSent: dmSent,
                error: error
            };
        } catch (error) {
            logger.error(`Error processing validator ${validator.address}: ${error.message}`, {
                validatorAddress: validator.address,
                errorStack: error.stack,
                errorName: error.name
            });
            return null;
        }
    }

    /**
     * Monitor all validators and report issues
     */
    async monitorValidators() {
        try {
            logger.info("Fetching validators to monitor...");
            
            let response;
            try {
                // Call getAllValidators without parameters to get all validators efficiently
                // The API returns all validators in one response when no pageToken is provided
                response = await this.client.getAllValidators(); 
            } catch (apiError) {
                logger.error(`Failed to fetch validators from API: ${apiError.message}`, {
                    status: apiError.response?.status,
                    statusText: apiError.response?.statusText,
                    endpoint: 'getAllValidators',
                    url: apiError.config?.url,
                    method: apiError.config?.method
                });
                throw new Error(`API call to getAllValidators failed with status ${apiError.response?.status || 'unknown'}: ${apiError.message}`);
            }
            
            const validatorsData = response?.data?.data;

            if (!validatorsData || !validatorsData.validators || !Array.isArray(validatorsData.validators)) {
                logger.warn("Could not retrieve validators list or list is not in expected format.", validatorsData);
                return [];
            }

            const allValidators = validatorsData.validators;
            
            if (allValidators.length === 0) {
                logger.info("No known validators to monitor.");
                return [];
            }
            
            logger.info(`Found ${allValidators.length} total validators to check.`);
            
            const reports = [];
            const results = await Promise.allSettled(
                allValidators.map(validator => this.processValidator(validator))
            );
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) reports.push(result.value);
                else if (result.status === 'rejected') logger.error(`Promise rejected during validator processing: ${result.reason}`);
            });
            
            if (!process.env.SKIP_MSG) {
                if (reports.length > 0) {
                    try {
                        await this.sendSummaryReport(reports);
                    } catch (summaryError) {
                        logger.error(`Failed to send summary report: ${summaryError.message}`);
                        // Don't throw here - we still want to return the reports even if summary fails
                    }
                }
            }

            logger.info(`Validator monitoring completed. Generated ${reports.length} alert reports.`);
            return reports;
        } catch (error) {
            logger.error(`Critical error in monitorValidators: ${error.message}`, {
                errorStack: error.stack,
                errorName: error.name
            });
            return []; // Return empty array if monitor fails critically
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
                const status = report.messageContent.includes('not attesting in the last 24 hours') ? 
                    'Not attesting (24h)' : `Missing attestations (${report.missPercentage})`;
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

    /**
     * Perform a health check on the API endpoints used by the validator monitor
     * @returns {Object} Health check results with detailed information
     */
    async healthCheck() {
        const results = {
            timestamp: new Date().toISOString(),
            overall: 'unknown',
            checks: {
                getAllValidators: { status: 'unknown', details: null }
            },
            summary: {
                passed: 0,
                failed: 0,
                total: 1
            }
        };

        // Test getAllValidators API
        try {
            logger.info('Health check: Testing getAllValidators API...');
            const startTime = Date.now();
            
            // Test pagination with a small limit for health check
            const response = await this.client.getAllValidators({ limit: 10 });
            const responseTime = Date.now() - startTime;
            
            const validatorsData = response?.data?.data;
            const validatorCount = validatorsData?.validators?.length || 0;
            const hasStats = validatorsData?.validators?.[0]?.totalSlots !== undefined;
            const hasPagination = validatorsData?.pagination !== undefined;
            
            results.checks.getAllValidators = {
                status: 'healthy',
                details: {
                    responseTime: `${responseTime}ms`,
                    statusCode: response?.status || 'unknown',
                    validatorCount: validatorCount,
                    dataStructure: validatorsData ? 'valid' : 'invalid',
                    hasValidatorStats: hasStats,
                    supportsPagination: hasPagination,
                    hasNextPageToken: !!validatorsData?.pagination?.nextPageToken
                }
            };
            results.summary.passed++;
            logger.info(`Health check: getAllValidators API - HEALTHY (${responseTime}ms, ${validatorCount} validators, pagination: ${hasPagination})`);
        } catch (error) {
            results.checks.getAllValidators = {
                status: 'unhealthy',
                details: {
                    error: error.message,
                    statusCode: error.response?.status || 'unknown',
                    statusText: error.response?.statusText || 'unknown',
                    url: error.config?.url || 'unknown'
                }
            };
            results.summary.failed++;
            logger.error(`Health check: getAllValidators API - UNHEALTHY: ${error.message}`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url
            });
        }

        // Determine overall health
        results.overall = results.summary.failed === 0 ? 'healthy' : 'unhealthy';
        
        logger.info(`Health check completed: ${results.summary.passed}/${results.summary.total} checks passed. Overall: ${results.overall.toUpperCase()}`);
        
        return results;
    }
}

module.exports = { ValidatorMonitorService }; 