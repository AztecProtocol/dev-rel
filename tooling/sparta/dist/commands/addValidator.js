import { SlashCommandBuilder } from "discord.js";
import { ValidatorService } from "../services/validator-service.js";
import { ChainInfoService } from "../services/chaininfo-service.js";
export default {
    data: new SlashCommandBuilder()
        .setName("validator")
        .setDescription("Manage validator addresses")
        .addSubcommand((subcommand) => subcommand
        .setName("add")
        .setDescription("Add yourself to the validator set")
        .addStringOption((option) => option
        .setName("address")
        .setDescription("Your validator address")))
        .addSubcommand((subcommand) => subcommand
        .setName("check")
        .setDescription("Check if you are a validator")
        .addStringOption((option) => option
        .setName("address")
        .setDescription("The validator address to check"))),
    execute: async (interaction) => {
        const address = interaction.options.getString("address");
        if (!address) {
            return interaction.reply({
                content: "Address is required.",
                ephemeral: true,
            });
        }
        // Basic address validation
        if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return interaction.reply({
                content: "Please provide a valid Ethereum address.",
                ephemeral: true,
            });
        }
        await interaction.deferReply();
        if (interaction.options.getSubcommand() === "add") {
            try {
                await ValidatorService.addValidator(address);
                await interaction.editReply({
                    content: `Successfully added validator address: ${address}`,
                });
            }
            catch (error) {
                await interaction.editReply({
                    content: `Failed to add validator address: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }
        else if (interaction.options.getSubcommand() === "check") {
            try {
                const info = await ChainInfoService.getInfo();
                const { validators, committee } = info;
                let reply = "";
                if (validators.includes(address)) {
                    reply += "You are a validator\n";
                }
                if (committee.includes(address)) {
                    reply += "You are a committee member\n";
                }
                await interaction.editReply({
                    content: reply,
                });
            }
            catch (error) {
                await interaction.editReply({
                    content: `Failed to check validator address: ${error instanceof Error ? error.message : String(error)}`,
                });
            }
        }
    },
};
