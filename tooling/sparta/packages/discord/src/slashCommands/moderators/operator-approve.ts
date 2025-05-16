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
        // Get Discord username from options
        const discordUsername = interaction.options.getString("user");

        if (!discordUsername) {
            await interaction.editReply("Please provide a Discord username.");
            return;
        }

        try {
            const client = await clientPromise;
            
            // Call the approve endpoint with the Discord username as query parameter
            try {
                // The OpenAPI client is correctly configured to handle query parameters
                // The endpoint is documented in the OpenAPI spec as /api/operator/approve
                // The approveOperator operation expects query parameters, not body
                await client.approveOperator(
                    { 
                        discordUsername: discordUsername 
                    },
                    null // No body data
                );
                
                const embed = new EmbedBuilder()
                    .setTitle("✅ OPERATOR APPROVED")
                    .setColor(0x00ff00) // Green for success
                    .setDescription(`Discord Username: \`${discordUsername}\``)
                    .addFields([
                        {
                            name: "Status",
                            value: "Operator has been successfully approved.",
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
                        .setDescription(`No node operator found with Discord username: \`${discordUsername}\``)
                        .addFields([
                            {
                                name: "Error",
                                value: "This Discord username is not registered in our database.",
                            }
                        ]);
        
                    await interaction.editReply({ embeds: [embed] });
                    return "NOT_FOUND";
                }
                
                // Other errors
                const embed = new EmbedBuilder()
                    .setTitle("❌ APPROVAL FAILED")
                    .setColor(0xff0000) // Red for failure
                    .setDescription(`Error approving operator with Discord username: \`${discordUsername}\``)
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
            logger.error("Error with operator API:", apiError);
            
            const embed = new EmbedBuilder()
                .setTitle("❌ APPROVAL FAILED")
                .setColor(0xff0000) // Red for failure
                .setDescription(`API service error when approving Discord username: \`${discordUsername}\``)
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
