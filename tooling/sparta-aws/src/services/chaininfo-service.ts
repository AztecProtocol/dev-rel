import { getParameter } from "../utils/parameter-store.js";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

type ChainInfo = {
	pendingBlockNum: string;
	provenBlockNum: string;
	validators: string[];
	committee: string[];
	archive: string[];
	currentEpoch: string;
	currentSlot: string;
	proposerNow: string;
};

const ecs = new ECSClient({});

export class ChainInfoService {
	static async getInfo(): Promise<ChainInfo> {
		try {
			// In development mode, return mock data
			if (process.env["ENVIRONMENT"] === "development") {
				const mockInfo: ChainInfo = {
					pendingBlockNum: "MOCK-123456",
					provenBlockNum: "MOCK-123455",
					validators: [
						"MOCK-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
						"MOCK-0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
					],
					committee: [
						"MOCK-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
						"MOCK-0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
					],
					archive: [
						"MOCK-0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
					],
					currentEpoch: "MOCK-1",
					currentSlot: "MOCK-12345",
					proposerNow:
						"MOCK-0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
				};
				return mockInfo;
			}

			// Production code (commented out for now)
			// const clusterArn = await getParameter("/sparta/ecs/cluster_arn");
			// const taskDefinition = await getParameter("/sparta/ecs/task_definition");
			// const containerName = await getParameter("/sparta/ecs/container_name");
			// const ethereumHost = await getParameter("/sparta/ethereum/host");
			// const rollupAddress = await getParameter("/sparta/ethereum/rollup_address");
			// const chainId = await getParameter("/sparta/ethereum/chain_id");

			// const command = new RunTaskCommand({
			//   cluster: clusterArn,
			//   taskDefinition: taskDefinition,
			//   launchType: 'FARGATE',
			//   networkConfiguration: {
			//     awsvpcConfiguration: {
			//       subnets: ['subnet-xxxxxx'],
			//       securityGroups: ['sg-xxxxxx'],
			//       assignPublicIp: 'ENABLED'
			//     }
			//   },
			//   overrides: {
			//     containerOverrides: [
			//       {
			//         name: containerName,
			//         command: [
			//           'debug-rollup',
			//           '-u', ethereumHost,
			//           '--rollup', rollupAddress,
			//           '--l1-chain-id', chainId
			//         ]
			//       }
			//     ]
			//   }
			// });

			// const response = await ecs.send(command);
			// TODO: Parse response and return actual data
			throw new Error("Production mode not implemented yet");
		} catch (error) {
			console.error("Error getting chain info:", error);
			throw error;
		}
	}
}
