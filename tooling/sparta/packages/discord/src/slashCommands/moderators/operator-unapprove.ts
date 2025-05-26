import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { logger } from "@sparta/utils";
import * as dotenv from "dotenv";
import { clientPromise } from "@sparta/utils/openapi/api/axios";

// Load environment variables
dotenv.config();

/**
 * Unapproves a node operator by setting their isApproved flag to false
 */
export async function unapproveUser(
    interaction: ChatInputCommandInteraction
) {
    try {
        // Get Discord username and user ID from options
        let discordUsername = interaction.options.getString("username");
        const discordUserId = interaction.options.getString("user-id");

        // Validate that at least one parameter is provided
        if (!discordUsername && !discordUserId) {
            await interaction.editReply("Please provide either a Discord username or Discord ID.");
            return;
        }

        // If no username but user ID provided, try to fetch username from Discord
        if (!discordUsername && discordUserId) {
            try {
                const user = await interaction.guild?.members.fetch(discordUserId);
                if (!user) {
                    await interaction.editReply("User not found with the provided Discord ID.");
                    return;
                }
                discordUsername = user.user.username;
            } catch (fetchError) {
                await interaction.editReply("Unable to fetch user information from the provided Discord ID.");
                return;
            }
        }

        try {
            const client = await clientPromise;
            
            // Call the unapprove endpoint using the high-level API method
            try {
                if (discordUsername) {
                    await client.unapproveOperator(
                        { 
                            discordUsername: discordUsername 
                        },
                        null // No body data
                    );
                } else if (discordUserId) {
                    await client.unapproveOperator(
                        { 
                            discordId: discordUserId
                        },
                        null // No body data
                    );
                }
                
                // Operator unapproved successfully
                const embed = new EmbedBuilder()
                    .setTitle("❌ OPERATOR UNAPPROVED")
                    .setColor(0xff6600) // Orange for warning/unapproval
                    .setDescription(`Discord Username: \`${discordUsername}\``)
                    .addFields([
                        {
                            name: "Status",
                            value: "Operator has been successfully unapproved.",
                        },
                        {
                            name: "Effect",
                            value: "The operator can no longer add new validators until re-approved.",
                        }
                    ]);
    
                await interaction.editReply({ embeds: [embed] });
                return "UNAPPROVED";
            } catch (unapprovalError: any) {
                console.log(unapprovalError);
                logger.error("Error unapproving operator:", unapprovalError);
                
                // If 404, operator not found
                if (unapprovalError.response && unapprovalError.response.status === 404) {
                    const embed = new EmbedBuilder()
                        .setTitle("❌ UNAPPROVAL FAILED")
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
                    .setTitle("❌ UNAPPROVAL FAILED")
                    .setColor(0xff0000) // Red for failure
                    .setDescription(`Error unapproving operator with Discord username: \`${discordUsername}\``)
                    .addFields([
                        {
                            name: "Error",
                            value: "There was an error with the unapproval process.",
                        }
                    ]);
    
                await interaction.editReply({ embeds: [embed] });
                return "UNAPPROVAL_ERROR";
            }
            
        } catch (apiError) {
            logger.error(apiError, "Error with operator API");
            
            const embed = new EmbedBuilder()
                .setTitle("❌ UNAPPROVAL FAILED")
                .setColor(0xff0000) // Red for failure
                .setDescription(`API service error when unapproving Discord username: \`${discordUsername}\``)
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
        logger.error("Error executing unapprove user command:", error);
        await interaction.editReply("Error unapproving operator.");
        throw error;
    }
} 