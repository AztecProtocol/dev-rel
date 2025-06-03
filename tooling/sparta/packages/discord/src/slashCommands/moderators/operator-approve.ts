import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";

// Load environment variables
dotenv.config();

/**
 * Approves a node operator by setting their isApproved flag to true
 */
export async function approveUser(
    interaction: ChatInputCommandInteraction
) {
    try {
        // Get Discord user ID from options - username is no longer supported
        const discordUserId = interaction.options.getString("user-id");

        // Validate that user ID is provided
        if (!discordUserId) {
            await interaction.editReply("Please provide a Discord ID.");
            return;
        }

        try {
            const client = await clientPromise;
            
            // Call the approve endpoint with the Discord ID as query parameter
            try {
                await client.approveOperator(
                    { 
                        discordId: discordUserId
                    },
                    null // No body data
                );
                
                // Operator approved, now send them a DM
                const messageRecipientId = discordUserId;
                const spartanMessageContent = `Hear ye, hear ye, brave Spartan warrior! 🛡️ You have been deemed worthy and are **APPROVED** to add a validator to the Aztec network!\n  \nIt is time to add your might!\n- Head to <#1367196595866828982>\n- Deploy your validator using the command: \`/operator add-validator <your_validator_address>\`\n  \n - Keep your shield up and your validator sharp! You can check its readiness with \`/operator my-stats\`. This is Sparta, and every warrior's strength counts!\n  \n**A true Spartan upholds the line!** Neglecting your duties (letting your validator falter) weakens our defenses and could lead to your validator being... *escorted from the ranks* (slashed). We wouldn't want that for a promising warrior like yourself.\n  \nShould you need guidance or counsel from the Ephors (that's us!), seek aid in the support channels.  \n \nVictory favors the prepared! This is SPARTAAAA! 💪`;

                let dmStatusMessage = "A direct message with next steps has been initiated."; // Default optimistic message

                try {
                    const messageApiResponse = await client.sendMessageToOperator(
                        { discordId: messageRecipientId },
                        {
                            message: spartanMessageContent
                        }
                    );

                    if (messageApiResponse.data.success) {
                        logger.info(`Successfully sent approval DM to Discord ID ${messageRecipientId}.`);
                    } else {
                        logger.error(`Failed to send approval DM to Discord ID ${messageRecipientId} via API: ${messageApiResponse.data.message || 'Unknown API error'}`);
                        dmStatusMessage = "Attempted to send DM, but it may have failed. See logs.";
                    }
                } catch (dmError: any) {
                    logger.error(`Exception sending approval DM to Discord ID ${messageRecipientId}:`, dmError.response?.data || dmError.message);
                    dmStatusMessage = "Error during DM attempt. See logs.";
                }

                const embed = new EmbedBuilder()
                    .setTitle("✅ OPERATOR APPROVED")
                    .setColor(0x00ff00) // Green for success
                    .setDescription(`Discord ID: \`${discordUserId}\``)
                    .addFields([
                        {
                            name: "Status",
                            value: "Operator has been successfully approved.",
                        },
                        {
                            name: "Next Steps",
                            value: dmStatusMessage,
                        }
                    ]);
    
                await interaction.editReply({ embeds: [embed] });
                return "APPROVED";
            } catch (approvalError: any) {
                console.log(approvalError);
                logger.error("Error approving operator:", approvalError);
                
                // If 404, operator not found
                if (approvalError.response && approvalError.response.status === 404) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ APPROVAL FAILED")
                        .setColor(0xff0000) // Red for failure
                        .setDescription(`No node operator found with Discord ID: \`${discordUserId}\``)
                        .addFields([
                            {
                                name: "Error",
                                value: "This Discord ID is not registered in our database.",
                            }
                        ]);
        
                    await interaction.editReply({ embeds: [embed] });
                    return "NOT_FOUND";
                }
                
                // If 403, check if it's due to slashing
                if (approvalError.response && approvalError.response.status === 403) {
                    const errorMessage = approvalError.response.data?.error || "";
                    if (errorMessage.includes("slashed")) {
                        const embed = new EmbedBuilder()
                            .setTitle("❌ APPROVAL BLOCKED")
                            .setColor(0xff0000) // Red for failure
                            .setDescription(`Cannot approve operator with Discord ID: \`${discordUserId}\``)
                            .addFields([
                                {
                                    name: "Reason",
                                    value: "This operator had a validator that was previously slashed.",
                                }
                            ]);
            
                        await interaction.editReply({ embeds: [embed] });
                        return "SLASHED_OPERATOR";
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle("❌ APPROVAL FAILED")
                            .setColor(0xff0000) // Red for failure
                            .setDescription(`Access denied when approving Discord ID: \`${discordUserId}\``)
                            .addFields([
                                {
                                    name: "Error",
                                    value: "You may not have sufficient permissions for this operation.",
                                }
                            ]);
            
                        await interaction.editReply({ embeds: [embed] });
                        return "ACCESS_DENIED";
                    }
                }
                
                // Other errors
                const embed = new EmbedBuilder()
                    .setTitle("❌ APPROVAL FAILED")
                    .setColor(0xff0000) // Red for failure
                    .setDescription(`Error approving operator with Discord ID: \`${discordUserId}\``)
                    .addFields([
                        {
                            name: "Error",
                            value: "There was an error with the approval process.",
                        }
                    ]);
    
                await interaction.editReply({ embeds: [embed] });
                return "APPROVAL_ERROR";
            }
            
        } catch (apiError) {
            logger.error(apiError, "Error with operator API");
            
            const embed = new EmbedBuilder()
                .setTitle("❌ APPROVAL FAILED")
                .setColor(0xff0000) // Red for failure
                .setDescription(`API service error when approving Discord ID: \`${discordUserId}\``)
                .addFields([
                    {
                        name: "Error",
                        value: "The operator service is currently unavailable.",
                    }
                ]);

            await interaction.editReply({ embeds: [embed] });
            return "API_ERROR";
        }
    } catch (error) {
        logger.error("Error executing approve user command:", error);
        await interaction.editReply("Error approving operator.");
        throw error;
    }
}
