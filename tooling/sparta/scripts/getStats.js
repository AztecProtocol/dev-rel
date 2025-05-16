import { EthAddress } from '@aztec/aztec.js';

// Define the structure based on the provided TypeScript types using JSDoc for clarity
// Although JavaScript doesn't enforce types, this helps document the expected structure.

/**
 * @typedef {object} SlotInfo
 * @property {bigint} timestamp
 * @property {bigint} slot
 * @property {string} date
 */

/**
 * @typedef {object} MissedStats
 * @property {number} currentStreak
 * @property {number} rate
 * @property {number} count
 */

/**
 * Represents the status of a validator at a specific slot.
 * @typedef {object} ValidatorStatus
 * @property {bigint} slot
 * @property {string} status - e.g., 'block-proposed', 'block-mined', 'attestation-sent', 'block-missed', 'attestation-missed'
 * @property {string} [reason] - Optional reason for the status
 */

/**
 * Represents the historical status of a validator.
 * @typedef {ValidatorStatus[]} ValidatorStatusHistory
 */

/**
 * @typedef {object} ValidatorStats
 * @property {string} address - EthAddress as a string
 * @property {SlotInfo} [lastProposal]
 * @property {SlotInfo} [lastAttestation]
 * @property {number} totalSlots
 * @property {MissedStats} missedProposals
 * @property {MissedStats} missedAttestations
 * @property {ValidatorStatusHistory} history
 */

/**
 * @typedef {object} ValidatorsStatsResponse
 * @property {{ [address: string]: ValidatorStats }} stats
 * @property {bigint} [lastProcessedSlot]
 * @property {bigint} [initialSlot]
 * @property {number} slotWindow
 */

/**
 * @typedef {object} JsonRpcResponse
 * @property {string} jsonrpc
 * @property {ValidatorsStatsResponse} result
 * @property {number} id
 * @property {object} [error] - Optional error object
 */

const rpcUrl = 'http://35.230.8.105:8080';
const methodName = 'node_getValidatorsStats';

/**
 * Fetches validator stats from the Aztec node RPC.
 * @returns {Promise<void>}
 */
async function getValidatorStats() {
  console.log(`Fetching validator stats from ${rpcUrl} using method ${methodName}...`);

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: methodName,
        params: [], // Assuming no parameters are needed for getValidatorsStats
        id: 67, // Using the ID from the example
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    /** @type {JsonRpcResponse} */
    const data = await response.json();

    if (data.error) {
        throw new Error(`RPC error! code: ${data.error.code}, message: ${data.error.message}`);
    }

    const validatorStats = data.result;

    console.log('Successfully fetched validator stats.');
    console.log(`Last Processed Slot: ${validatorStats.lastProcessedSlot ?? 'N/A'}`);
    console.log(`Initial Slot: ${validatorStats.initialSlot ?? 'N/A'}`);
    console.log(`Slot Window: ${validatorStats.slotWindow}`);
    console.log('\nValidator Attestation Details:');

    for (const [address, stats] of Object.entries(validatorStats.stats)) {
      console.log(`\n  Validator: ${address}`);
      if (stats.lastAttestation) {
        // Convert bigint timestamps/slots if they arrive as strings or numbers
        const lastAttestationSlot = BigInt(stats.lastAttestation.slot);
        const lastAttestationTimestamp = BigInt(stats.lastAttestation.timestamp);

        console.log(`    Last Attestation:`);
        console.log(`      Slot: ${lastAttestationSlot}`);
        console.log(`      Timestamp: ${lastAttestationTimestamp}`);
        console.log(`      Date: ${stats.lastAttestation.date}`); // Assuming date is already a string
      } else {
        console.log(`    Last Attestation: None found in history.`);
      }
      // Optionally log other stats like missed attestations
      // console.log(`    Missed Attestations Count: ${stats.missedAttestations.count}`);
      // console.log(`    Missed Attestations Rate: ${stats.missedAttestations.rate.toFixed(4)}`);
    }

  } catch (error) {
    console.error('Failed to fetch or process validator stats:', error);
  }
}

// Run the script
getValidatorStats();
