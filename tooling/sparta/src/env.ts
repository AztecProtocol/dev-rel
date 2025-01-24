import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import dotenv from "dotenv";

const loadSecrets = async () => {
	try {
		console.log("Loading secrets from AWS Secrets Manager");
		const secretsManager = new SecretsManager({
			region: process.env.AWS_REGION || "us-west-2",
		});

		const secretKeys = [
			"TOKEN",
			"CLIENT_ID",
			"GUILD_ID",
			"ETHEREUM_HOST",
			"ETHEREUM_ROLLUP_ADDRESS",
			"ETHEREUM_ADMIN_ADDRESS",
			"ETHEREUM_CHAIN_ID",
			"ETHEREUM_PRIVATE_KEY",
			"ETHEREUM_VALUE",
			"BOT_TOKEN",
			"BOT_CLIENT_ID",
		];

		await Promise.all(
			secretKeys.map(async (key) => {
				try {
					const secret = await secretsManager.getSecretValue({
						SecretId: `sparta-bot/${key}`,
					});
					if (secret.SecretString) {
						process.env[key] = secret.SecretString;
					}
				} catch (error) {
					console.error(`Error loading secret ${key}:`, error);
				}
			})
		);

		// Log loaded environment variables (excluding sensitive ones)
		const safeKeys = [
			"GUILD_ID",
			"ETHEREUM_HOST",
			"ETHEREUM_ROLLUP_ADDRESS",
			"ETHEREUM_ADMIN_ADDRESS",
			"ETHEREUM_CHAIN_ID",
		];
		console.log("Loaded environment variables:");
		safeKeys.forEach((key) => {
			console.log(`${key}: ${process.env[key]}`);
		});
	} catch (error) {
		console.error("Error initializing Secrets Manager:", error);
		throw error;
	}
};

if (
	process.env.ENVIRONMENT === "staging" ||
	process.env.ENVIRONMENT === "production"
) {
	await loadSecrets();
} else {
	console.log("Loading environment from .env file");
	dotenv.config();
}

export const {
	TOKEN,
	CLIENT_ID,
	GUILD_ID,
	ETHEREUM_HOST,
	ETHEREUM_ROLLUP_ADDRESS,
	ETHEREUM_ADMIN_ADDRESS,
	ETHEREUM_CHAIN_ID,
	ETHEREUM_PRIVATE_KEY,
	ETHEREUM_VALUE,
	BOT_TOKEN,
	BOT_CLIENT_ID,
} = process.env as {
	TOKEN: string;
	CLIENT_ID: string;
	GUILD_ID: string;
	ETHEREUM_HOST: string;
	ETHEREUM_ROLLUP_ADDRESS: string;
	ETHEREUM_ADMIN_ADDRESS: string;
	ETHEREUM_CHAIN_ID: string;
	ETHEREUM_PRIVATE_KEY: string;
	ETHEREUM_VALUE: string;
	BOT_TOKEN: string;
	BOT_CLIENT_ID: string;
};
