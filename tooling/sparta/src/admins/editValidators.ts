import {
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
} from "discord.js";
import { ChainInfoService } from "../services/chaininfo-service.js";
import { paginate } from "../utils/pagination.js";
import { ValidatorService } from "../services/validator-service.js";

export const EXCLUDED_VALIDATORS = [
	"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
	"0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
	"0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
	"0x90F79bf6EB2c4f870365E785982E1f101E93b906",
	"0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
	"0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
	"0x976EA74026E726554dB657fA54763abd0C3a0aa9",
	"0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
	"0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
	"0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
	"0xBcd4042DE499D14e55001CcbB24a551F3b954096",
	"0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
	"0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
	"0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
	"0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
	"0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
	"0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
	"0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
	"0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
	"0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
	"0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f",
	"0x02484cb50AAC86Eae85610D6f4Bf026f30f6627D",
	"0x08135Da0A343E492FA2d4282F2AE34c6c5CC1BbE",
	"0x5E661B79FE2D3F6cE70F5AAC07d8Cd9abb2743F1",
	"0x61097BA76cD906d2ba4FD106E757f7Eb455fc295",
	"0xDf37F81dAAD2b0327A0A50003740e1C935C70913",
	"0x553BC17A05702530097c3677091C5BB47a3a7931",
	"0x87BdCE72c06C21cd96219BD8521bDF1F42C78b5e",
	"0x40Fc963A729c542424cD800349a7E4Ecc4896624",
	"0x9DCCe783B6464611f38631e6C851bf441907c710",
	"0x1BcB8e569EedAb4668e55145Cfeaf190902d3CF2",
	"0x8263Fce86B1b78F95Ab4dae11907d8AF88f841e7",
	"0xcF2d5b3cBb4D7bF04e3F7bFa8e27081B52191f91",
	"0x86c53Eb85D0B7548fea5C4B4F82b4205C8f6Ac18",
	"0x1aac82773CB722166D7dA0d5b0FA35B0307dD99D",
	"0x2f4f06d218E426344CFE1A83D53dAd806994D325",
	"0x1003ff39d25F2Ab16dBCc18EcE05a9B6154f65F4",
	"0x9eAF5590f2c84912A08de97FA28d0529361Deb9E",
	"0x11e8F3eA3C6FcF12EcfF2722d75CEFC539c51a1C",
	"0x7D86687F980A56b832e9378952B738b614A99dc6",
	"0x9eF6c02FB2ECc446146E05F1fF687a788a8BF76d",
	"0x08A2DE6F3528319123b25935C92888B16db8913E",
	"0xe141C82D99D85098e03E1a1cC1CdE676556fDdE0",
	"0x4b23D303D9e3719D6CDf8d172Ea030F80509ea15",
	"0xC004e69C5C04A223463Ff32042dd36DabF63A25a",
	"0x5eb15C0992734B5e77c888D713b4FC67b3D679A2",
	"0x7Ebb637fd68c523613bE51aad27C35C4DB199B9c",
	"0x3c3E2E178C69D4baD964568415a0f0c84fd6320A",
];

export default {
	data: new SlashCommandBuilder()
		.setName("admin")
		.setDescription("Admin commands")
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.addSubcommandGroup((group) =>
			group
				.setName("get")
				.setDescription("Get info about validators")
				.addSubcommand((subcommand) =>
					subcommand
						.setName("validators")
						.setDescription("Get validators")
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName("committee")
						.setDescription("Get committee")
				)
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("remove")
				.setDescription("Remove a validator")
				.addStringOption((option) =>
					option
						.setName("address")
						.setDescription("The validator to remove")
						.setRequired(true)
				)
		),

	execute: async (interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply({
			flags: MessageFlags.Ephemeral,
		});

		try {
			const addressesPerPage = 40;

			const { validators, committee } = await ChainInfoService.getInfo();
			const filteredValidators = (validators as string[]).filter(
				(v) => !EXCLUDED_VALIDATORS.includes(v)
			);
			const filteredCommittee = (committee as string[]).filter(
				(v) => !EXCLUDED_VALIDATORS.includes(v)
			);
			if (interaction.options.getSubcommand() === "committee") {
				await paginate(
					filteredCommittee,
					committee.length,
					addressesPerPage,
					interaction,
					"Committee"
				);
			} else if (interaction.options.getSubcommand() === "validators") {
				await paginate(
					filteredValidators,
					validators.length,
					addressesPerPage,
					interaction,
					"Validators"
				);
			} else if (interaction.options.getSubcommand() === "remove") {
				const address = interaction.options.getString("address");
				if (!address) {
					await interaction.editReply({
						content: "Please provide an address to remove",
					});
					return;
				}
				await ValidatorService.removeValidator(address);
				await interaction.editReply({
					content: `Removed validator ${address}`,
				});
			}
			return;
		} catch (error) {
			console.error("Error in get-info command:", error);
			await interaction.editReply({
				content: `Failed to get chain info`,
			});
		}
	},
};
