import { ChatInputCommandInteraction, CommandInteraction, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import { logger } from "@sparta/utils";
import { validateAddressFromInteraction } from "@sparta/utils/inputValidator";

// Load environment variables
dotenv.config();

// RPC endpoint URL
const RPC_URL = process.env.RPC_URL || 'http://35.230.8.105:8080'; // Use env var or default
const RPC_METHOD = 'node_getValidatorsStats';

// --- Define types based on RPC response ---

interface SlotInfo {
  timestamp: bigint;
  slot: bigint;
  date: string;
}

interface ValidatorStats {
  address: string; // EthAddress as string
  lastProposal?: SlotInfo;
  lastAttestation?: SlotInfo;
  totalSlots: number;
  // Simplified missed stats for this use case, add more if needed
  missedProposals: { count: number };
  missedAttestations: { count: number };
  // history: ValidatorStatusHistory; // Assuming history is not directly needed for this check
}

interface ValidatorsStatsResponse {
  stats: { [address: string]: ValidatorStats };
  lastProcessedSlot?: bigint;
  initialSlot?: bigint;
  slotWindow: number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: ValidatorsStatsResponse; // Make result optional for error handling
  id: number;
  error?: { code: number; message: string }; // Optional error object
}

/**
 * Result structure for the RPC-based attestation check
 */
interface RpcAttestationResult {
  hasAttested24h: boolean;
  lastAttestationSlot?: bigint;
  lastAttestationTimestamp?: bigint;
  lastAttestationDate?: string;
  lastProposalSlot?: bigint;
  lastProposalTimestamp?: bigint;
  lastProposalDate?: string;
  missedAttestationsCount?: number;
  missedProposalsCount?: number;
  totalSlots?: number;
  error?: string;
}

/**
 * Fetches validator stats via RPC and checks recent attestation.
 * @param targetAddress Ethereum address to check (lowercase expected by RPC)
 * @returns Attestation status with details from RPC
 */
async function fetchValidatorStatsFromRpc(targetAddress: string): Promise<RpcAttestationResult> {
  try {
    // Ensure address is lowercase for matching keys in the response
    const lowerCaseAddress = targetAddress.toLowerCase();

    logger.info(`Fetching validator stats from ${RPC_URL} for ${lowerCaseAddress}...`);

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: RPC_METHOD,
        params: [], // No specific params needed for getValidatorsStats
        id: 1, // Arbitrary ID
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    const data: JsonRpcResponse = await response.json();

    if (data.error) {
      throw new Error(`RPC error! code: ${data.error.code}, message: ${data.error.message}`);
    }

    if (!data.result) {
        throw new Error('RPC response missing result field.');
    }

    const validatorStats = data.result.stats[lowerCaseAddress];

    if (!validatorStats) {
      return {
        hasAttested24h: false,
        error: `Validator ${targetAddress} not found in node stats.`,
      };
    }

    const lastAttestation = validatorStats.lastAttestation;
    const lastProposal = validatorStats.lastProposal;
    let hasAttested24h = false;
    let lastAttestationTimestampBigInt: bigint | undefined = undefined;
    let lastProposalTimestampBigInt: bigint | undefined = undefined;
    let lastProposalSlotBigInt: bigint | undefined = undefined;
    let lastProposalDate: string | undefined = undefined;

    if (lastAttestation) {
      try {
        lastAttestationTimestampBigInt = BigInt(lastAttestation.timestamp);
        const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
        const twentyFourHoursAgoSeconds = nowSeconds - BigInt(24 * 60 * 60);

        if (lastAttestationTimestampBigInt >= twentyFourHoursAgoSeconds) {
          hasAttested24h = true;
        }
      } catch (e) {
          logger.error("Error converting attestation timestamp to BigInt:", e);
      }
    }

    if (lastProposal) {
        try {
            lastProposalTimestampBigInt = BigInt(lastProposal.timestamp);
            lastProposalSlotBigInt = BigInt(lastProposal.slot);
            lastProposalDate = lastProposal.date;
        } catch (e) {
            logger.error("Error converting proposal timestamp/slot to BigInt:", e);
        }
    }

    return {
      hasAttested24h,
      lastAttestationSlot: lastAttestation ? BigInt(lastAttestation.slot) : undefined,
      lastAttestationTimestamp: lastAttestationTimestampBigInt,
      lastAttestationDate: lastAttestation?.date,
      lastProposalSlot: lastProposalSlotBigInt,
      lastProposalTimestamp: lastProposalTimestampBigInt,
      lastProposalDate: lastProposalDate,
      missedAttestationsCount: validatorStats.missedAttestations?.count,
      missedProposalsCount: validatorStats.missedProposals?.count,
      totalSlots: validatorStats.totalSlots,
      error: undefined // No error if we got this far
    };

  } catch (error) {
    logger.error('Error fetching or processing validator stats via RPC:', error);
    return {
      hasAttested24h: false,
      error: error instanceof Error ? error.message : 'Unknown error during RPC fetch',
      lastAttestationSlot: undefined,
      lastAttestationTimestamp: undefined,
      lastAttestationDate: undefined,
      lastProposalSlot: undefined,
      lastProposalTimestamp: undefined,
      lastProposalDate: undefined,
      missedAttestationsCount: undefined,
      missedProposalsCount: undefined,
      totalSlots: undefined
    };
  }
}

/**
 * Discord command handler for attestation check commands
 */
export async function getValidatorStats(interaction: ChatInputCommandInteraction) {
  try {
    // Get the first option as the subcommand
    const subcommandGroup = interaction.options.data[0]?.name;
    
    if (subcommandGroup === "get") {
      // Handle the check subcommand
      await handleGetCommand(interaction);
    } else {
      await interaction.reply({
        content: "Unknown command. Please use `/admin get validator`",
        ephemeral: true
      });
    }
  } catch (error) {
    console.error("Error processing committee command:", error);
    await interaction.reply({
      content: "An error occurred while processing the command.",
      ephemeral: true
    });
  }
}

/**
 * Handle the "check" subcommand to check if address has attested in last 24h using RPC
 */
async function handleGetCommand(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply();
	const address = validateAddressFromInteraction(interaction);

    if (!address || typeof address !== 'string') {
      await interaction.editReply("Please provide a valid Ethereum address.");
      return;
    }

     // Validate basic address format (optional but recommended)
     if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        await interaction.editReply("Invalid Ethereum address format.");
        return;
    }

    // Fetch stats using the new RPC function
    const result = await fetchValidatorStatsFromRpc(address);

    const displayAddress = `${address.slice(0, 6)}...${address.slice(-4)}`; // Shortened address for title

    // Create a Discord embed for the result
    const embed = new EmbedBuilder()
      .setTitle(`RPC Validator Check: ${displayAddress}`)
      .setColor(result.error ? 0xFF0000 : (result.hasAttested24h ? 0x00FF00 : 0xFFA500)) // Red for error, Green for success, Orange for no recent
      .setTimestamp()
      .setFooter({ text: 'Sparta RPC Validator Check' });

    if (result.error) {
      embed.setDescription(`❌ **Error:** ${result.error}`);
    } else {
      // Primary status message
      if (result.hasAttested24h) {
        embed.setDescription(`✅ **Validator HAS attested in the last 24 hours.**`);
      } else if (result.lastAttestationTimestamp) {
         embed.setDescription(`🟠 **Validator has NOT attested in the last 24 hours.**`);
      } else {
          embed.setDescription(`⚪️ **Validator has NO attestation history recorded by the node.**`);
          embed.setColor(0x808080); // Grey for no data
      }

      // Additional information fields
      const fields = [];

      if (result.lastAttestationSlot !== undefined) {
        fields.push({
          name: 'Last Attestation Seen by Node',
          value: `Slot: ${result.lastAttestationSlot}\nTimestamp: ${result.lastAttestationTimestamp}\nDate: ${result.lastAttestationDate ? new Date(result.lastAttestationDate).toLocaleString() : 'N/A'}`,
          inline: false
        });
      } else {
          fields.push({
              name: 'Last Attestation Seen by Node',
              value: 'None recorded',
              inline: false
          });
      }

      if (result.lastProposalSlot !== undefined) {
        fields.push({
          name: 'Last Proposal Seen by Node',
          value: `Slot: ${result.lastProposalSlot}\nTimestamp: ${result.lastProposalTimestamp}\nDate: ${result.lastProposalDate ? new Date(result.lastProposalDate).toLocaleString() : 'N/A'}`,
          inline: false
        });
      } else {
          fields.push({
              name: 'Last Proposal Seen by Node',
              value: 'None recorded',
              inline: false
          });
      }

      if (result.missedAttestationsCount !== undefined) {
          fields.push({
              name: 'Missed Attestations',
              value: result.missedAttestationsCount.toString(),
              inline: true
          });
      }
      if (result.missedProposalsCount !== undefined) {
        fields.push({
            name: 'Missed Proposals',
            value: result.missedProposalsCount.toString(),
            inline: true
        });
      }
      if (result.totalSlots !== undefined) {
        fields.push({
            name: 'Total Slots Checked',
            value: result.totalSlots.toString(),
            inline: true
        });
      }

      if (fields.length > 0) {
         embed.addFields(fields);
      }
    }

    await interaction.editReply({ embeds: [embed] });
    return embed.toJSON();
  } catch (error) {
    logger.error('Error executing RPC attestation check command:', error);

    throw error;
  }
}
