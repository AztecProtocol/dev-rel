import { ethereum } from "../clients/ethereum.js";
import { getExpectedAddress } from "../clients/ethereum.js";

type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	forwardedValidators: string[];
	committee: string[];
	forwardedCommittee: string[];
	archive: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

export class ChainInfoService {
	static async getInfo(): Promise<ChainInfo> {
		try {
			const rollup = ethereum.getRollup();
			const [
				pendingNum,
				provenNum,
				validators,
				committee,
				archive,
				epochNum,
				slot,
				nextBlockTS,
			] = await Promise.all([
				rollup.read.getPendingBlockNumber(),
				rollup.read.getProvenBlockNumber(),
				rollup.read.getAttesters(),
				rollup.read.getCurrentEpochCommittee(),
				rollup.read.archive(),
				rollup.read.getCurrentEpoch(),
				rollup.read.getCurrentSlot(),
				rollup.read.getCurrentProposer(),
				(async () => {
					const block = await ethereum.getPublicClient().getBlock();
					return BigInt(block.timestamp + BigInt(12));
				})(),
			]);

			const proposer = await rollup.read.getProposerAt([nextBlockTS]);

			return {
				pendingBlockNum: pendingNum as string,
				provenBlockNum: provenNum as string,
				validators: validators,
				forwardedValidators: validators.map(
					(e: `0x${string}`) => getExpectedAddress([e], e).address
				),
				committee: committee,
				forwardedCommittee: committee.map(
					(e: `0x${string}`) => getExpectedAddress([e], e).address
				),
				archive: archive as string[],
				currentEpoch: epochNum as string,
				currentSlot: slot as string,
				proposerNow: proposer as string,
			};
		} catch (error) {
			console.error("Error getting chain info:", error);
			throw error;
		}
	}
}
