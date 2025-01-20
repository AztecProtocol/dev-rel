import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});

const ENV_MAP: Record<string, string> = {
	"/sparta/discord/bot_token": "DISCORD_BOT_TOKEN",
	"/sparta/discord/public_key": "DISCORD_PUBLIC_KEY",
	"/sparta/ethereum/host": "ETHEREUM_HOST",
	"/sparta/ethereum/rollup_address": "ETHEREUM_ROLLUP_ADDRESS",
	"/sparta/ethereum/admin_address": "ETHEREUM_ADMIN_ADDRESS",
	"/sparta/ethereum/chain_id": "ETHEREUM_CHAIN_ID",
	"/sparta/ethereum/mnemonic": "ETHEREUM_MNEMONIC",
	"/sparta/ethereum/private_key": "ETHEREUM_PRIVATE_KEY",
	"/sparta/ethereum/value": "ETHEREUM_VALUE",
	"/sparta/ecs/cluster_arn": "ECS_CLUSTER_ARN",
	"/sparta/ecs/task_definition": "ECS_TASK_DEFINITION",
	"/sparta/ecs/container_name": "ECS_CONTAINER_NAME",
};

export async function getParameter(name: string): Promise<string> {
	// In development mode, use environment variables
	if (process.env.ENVIRONMENT === "development") {
		const envVar = ENV_MAP[name];
		if (!envVar) {
			throw new Error(
				`No environment variable mapping found for parameter: ${name}`
			);
		}
		const value = process.env[envVar];
		if (!value) {
			throw new Error(`Environment variable not set: ${envVar}`);
		}
		return value;
	}

	// In production mode, use AWS Parameter Store
	const command = new GetParameterCommand({
		Name: name,
		WithDecryption: true,
	});

	const response = await ssm.send(command);
	if (!response.Parameter?.Value) {
		throw new Error(`Parameter not found: ${name}`);
	}

	return response.Parameter.Value;
}

export async function getParameters(
	names: string[]
): Promise<Record<string, string>> {
	const results: Record<string, string> = {};

	for (const name of names) {
		results[name] = await getParameter(name);
	}

	return results;
}
