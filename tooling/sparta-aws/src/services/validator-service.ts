import { getParameter } from "../utils/parameter-store.js";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

const ecs = new ECSClient({});

export class ValidatorService {
	static async addValidator(address: string): Promise<string> {
		try {
			//   const clusterArn = await getParameter('/sparta/ecs/cluster_arn');
			//   const taskDefinition = await getParameter('/sparta/ecs/task_definition');
			//   const containerName = await getParameter('/sparta/ecs/container_name');
			//   const ethereumHost = await getParameter('/sparta/ethereum/host');
			//   const rollupAddress = await getParameter('/sparta/ethereum/rollup_address');
			//   const adminAddress = await getParameter('/sparta/ethereum/admin_address');
			//   const chainId = await getParameter('/sparta/ethereum/chain_id');
			//   const mnemonic = await getParameter('/sparta/ethereum/mnemonic');

			//   // First, fund the validator
			//   await this.fundValidator(address);

			//   // Then add the validator to the set
			//   const command = new RunTaskCommand({
			//     cluster: clusterArn,
			//     taskDefinition: taskDefinition,
			//     launchType: 'FARGATE',
			//     networkConfiguration: {
			//       awsvpcConfiguration: {
			//         subnets: ['subnet-xxxxxx'], // Replace with actual subnet IDs
			//         securityGroups: ['sg-xxxxxx'], // Replace with actual security group IDs
			//         assignPublicIp: 'ENABLED'
			//       }
			//     },
			//     overrides: {
			//       containerOverrides: [
			//         {
			//           name: containerName,
			//           command: [
			//             'add-l1-validator',
			//             '-u', ethereumHost,
			//             '--validator', address,
			//             '--rollup', rollupAddress,
			//             '--withdrawer', adminAddress,
			//             '--l1-chain-id', chainId,
			//             '--mnemonic', mnemonic
			//           ]
			//         }
			//       ]
			//     }
			//   });

			//   const response = await ecs.send(command);
			return "Validator added successfully";
		} catch (error) {
			console.error("Error adding validator:", error);
			throw error;
		}
	}

	static async removeValidator(address: string): Promise<string> {
		try {
			//   const clusterArn = await getParameter('/sparta/ecs/cluster_arn');
			//   const taskDefinition = await getParameter('/sparta/ecs/task_definition');
			//   const containerName = await getParameter('/sparta/ecs/container_name');
			//   const ethereumHost = await getParameter('/sparta/ethereum/host');
			//   const rollupAddress = await getParameter('/sparta/ethereum/rollup_address');
			//   const chainId = await getParameter('/sparta/ethereum/chain_id');
			//   const mnemonic = await getParameter('/sparta/ethereum/mnemonic');

			//   const command = new RunTaskCommand({
			//     cluster: clusterArn,
			//     taskDefinition: taskDefinition,
			//     launchType: 'FARGATE',
			//     networkConfiguration: {
			//       awsvpcConfiguration: {
			//         subnets: ['subnet-xxxxxx'], // Replace with actual subnet IDs
			//         securityGroups: ['sg-xxxxxx'], // Replace with actual security group IDs
			//         assignPublicIp: 'ENABLED'
			//       }
			//     },
			//     overrides: {
			//       containerOverrides: [
			//         {
			//           name: containerName,
			//           command: [
			//             'remove-l1-validator',
			//             '-u', ethereumHost,
			//             '--validator', address,
			//             '--rollup', rollupAddress,
			//             '--l1-chain-id', chainId,
			//             '--mnemonic', mnemonic
			//           ]
			//         }
			//       ]
			//     }
			//   });

			//   const response = await ecs.send(command);
			return "MOCK: Validator removed successfully";
		} catch (error) {
			console.error("Error removing validator:", error);
			throw error;
		}
	}

	static async fundValidator(address: string): Promise<string> {
		try {
			//   const clusterArn = await getParameter('/sparta/ecs/cluster_arn');
			//   const taskDefinition = await getParameter('/sparta/ecs/task_definition');
			//   const containerName = await getParameter('/sparta/ecs/container_name');
			//   const ethereumHost = await getParameter('/sparta/ethereum/host');
			//   const chainId = await getParameter('/sparta/ethereum/chain_id');
			//   const privateKey = await getParameter('/sparta/ethereum/private_key');
			//   const value = await getParameter('/sparta/ethereum/value');

			//   const command = new RunTaskCommand({
			//     cluster: clusterArn,
			//     taskDefinition: taskDefinition,
			//     launchType: 'FARGATE',
			//     networkConfiguration: {
			//       awsvpcConfiguration: {
			//         subnets: ['subnet-xxxxxx'], // Replace with actual subnet IDs
			//         securityGroups: ['sg-xxxxxx'], // Replace with actual security group IDs
			//         assignPublicIp: 'ENABLED'
			//       }
			//     },
			//     overrides: {
			//       containerOverrides: [
			//         {
			//           name: containerName,
			//           command: [
			//             'cast',
			//             'send',
			//             '--value', value,
			//             '--rpc-url', ethereumHost,
			//             '--chain-id', chainId,
			//             '--private-key', privateKey,
			//             address
			//           ]
			//         }
			//       ]
			//     }
			//   });

			//   const response = await ecs.send(command);
			return "MOCK: Validator funded successfully";
		} catch (error) {
			console.error("Error funding validator:", error);
			throw error;
		}
	}
}
