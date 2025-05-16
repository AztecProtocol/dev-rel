const { logger, CHANNELS } = require("@sparta/utils");
const { l2InfoService } = require("@sparta/ethereum");
const { clientPromise } = require("@sparta/utils/openapi/api/axios");
const { discordWebhookService } = require("@sparta/discord");

/**
 * Service to monitor validator status and alert operators
 */
class ValidatorMonitorService {
    constructor(client) {
        this.client = client;
        this.discordService = discordWebhookService; // Using lightweight webhook service
        this.isDev = process.env.NODE_ENV !== "production";
    }
    
    static async new() {
        const client = await clientPromise;
        return new ValidatorMonitorService(client);
    }

    /**
     * Check a single validator's status and send alerts if needed
     * @param {string} validator - Validator address
     * @param {Array} activeValidators - List of active validators
     */
    async processValidator(validator, activeValidators) {
        try {
            // Check if validator is in active set
            const isInValidatorSet = activeValidators.includes(validator);
            
            // Skip processing if validator is active and attesting
            if (isInValidatorSet) {
                // Check attestation stats
                const validatorStats = await l2InfoService.fetchValidatorStats(validator);
                
                if (validatorStats.totalSlots && validatorStats.missedAttestationsCount !== undefined) {
                    const missPercent = (validatorStats.missedAttestationsCount / validatorStats.totalSlots) * 100;
                    
                    // Only alert if missing too many attestations (>20%)
                    if (missPercent < 20) {
                        return null; // Validator is working well, no alert needed
                    }
                } else {
                    return null; // No stats available, assume it's working
                }
            }
            
            // At this point, we have a validator that either:
            // 1. Is not in the active set
            // 2. Is missing too many attestations
            
            // Get validator details to find operator for notification
            const { data: { data: validatorData } } = await this.client.getValidator(validator);
            
            if (!validatorData || !validatorData.operatorInfo?.discordUsername) {
                logger.warn(`No operator info found for validator ${validator}`);
                return null;
            }
            
            // Calculate miss percentage for reporting
            let missPercentage = "N/A";
            let alertReason = "";
            
            if (!isInValidatorSet) {
                alertReason = "not in active validator set";
            } else {
                // We already calculated this earlier but need to do it again 
                // since we early-returned if everything was fine
                const stats = await l2InfoService.fetchValidatorStats(validator);
                if (stats.totalSlots && stats.missedAttestationsCount !== undefined) {
                    missPercentage = ((stats.missedAttestationsCount / stats.totalSlots) * 100).toFixed(2) + "%";
                    alertReason = `missing attestations (${missPercentage})`;
                }
            }
            
            // Create alert message
            const messageContent = `**Validator Alert**\n\nHello ${validatorData.operatorInfo.discordUsername},\n\n` +
                `Your validator ${validator} is ${alertReason}. Please check your node status.\n\n` +
                `If you need assistance, please reach out in the <#${CHANNELS.OPERATORS_START_HERE.id}> channel.`;
            
            // Send Discord alert using the lightweight service
            const targetDiscordId = this.isDev ? "411954463541166080" : validatorData.operatorId;
            let dmSent = false;
            let error = null;
            
            try {
                if (targetDiscordId) {
                    dmSent = await this.discordService.sendDirectMessage(targetDiscordId, messageContent);
                    
                    if (dmSent) {
                        logger.info(`Alert sent to ${validatorData.operatorInfo.discordUsername} for validator ${validator}`);
                    } else {
                        error = "Discord webhook service returned false";
                    }
                } else {
                    error = "Missing Discord ID";
                }
            } catch (dmError) {
                error = dmError.message;
                logger.error(`Failed to send alert for validator ${validator}: ${error}`);
            }
            
            // Return report of the alert
            return {
                validatorAddress: validator,
                operatorId: validatorData.operatorId,
                operatorDiscordUsername: validatorData.operatorInfo.discordUsername,
                messageContent: messageContent,
                missPercentage: missPercentage,
                timestamp: new Date().toISOString(),
                dmSent: dmSent,
                error: error
            };
        } catch (error) {
            logger.error(`Error processing validator ${validator}: ${error.message}`);
            return null;
        }
    }

    /**
     * Monitor all validators and report issues
     */
    async monitorValidators() {
        try {
            logger.info("Starting validator monitoring...");
            
            // Get all validators
            const { data: { data: validatorsData } } = await this.client.getAllValidators();
            
            if (!validatorsData || !validatorsData.knownValidators?.validators) {
                logger.error("Failed to get validators from API");
                return [];
            }

            const validators = validatorsData.knownValidators.validators;
            logger.info(`Found ${validators.length} validators to check`);
            
            // Process validators in parallel
            const reports = [];
            const results = await Promise.allSettled(
                validators.map(validator => this.processValidator(validator, validators))
            );
            
            // Filter valid reports (removing null/rejected promises)
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    reports.push(result.value);
                }
            });
            
            // Send summary report if needed
            if (reports.length > 0) {
                await this.sendSummaryReport(reports);
            }
            
            logger.info(`Validator monitoring completed. Found ${reports.length} issues.`);
            return reports;
        } catch (error) {
            logger.error(`Error monitoring validators: ${error.message}`);
            return [];
        }
    }

    /**
     * Send a summary report to the mod-bot channel using webhook service
     */
    async sendSummaryReport(reports) {
        try {
            const channelId = this.isDev ? CHANNELS.BOT_TEST.id : CHANNELS.MOD_BOT.id;
            
            // Create summary message
            let message = "# Validator Alert Summary\n\n";
            message += `**Time:** ${new Date().toISOString()}\n`;
            message += `**Total Alerts:** ${reports.length}\n\n`;
            
            // Add brief information about each alert
            reports.forEach(report => {
                message += `- **${report.validatorAddress}** (${report.operatorDiscordUsername}): `;
                message += report.messageContent.includes('not in active validator set') ? 
                    'Not in validator set' : `Missing attestations (${report.missPercentage})`;
                message += report.dmSent ? ' - Alert sent' : ` - Alert failed: ${report.error}`;
                message += '\n';
            });
            
            // Send to Discord channel using webhook service
            await this.discordService.sendChannelMessage(channelId, message);
            logger.info(`Sent summary report to channel ${channelId}`);
        } catch (error) {
            logger.error(`Error sending summary report: ${error.message}`);
        }
    }
}

module.exports = { ValidatorMonitorService }; 