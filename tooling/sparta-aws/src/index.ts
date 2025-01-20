import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Client, GatewayIntentBits, Collection } from "discord.js";
import { SSMClient } from "@aws-sdk/client-ssm";
import { loadCommands } from "./commands/index.js";
import { verifyDiscordRequest } from "./utils/discord-verify.js";
import { getParameter } from "./utils/parameter-store.js";
import type { ExtendedClient } from "./types/discord.js";

const ssm = new SSMClient({});
let client: ExtendedClient;

export const handler = async (
	event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
	try {
		// Verify Discord request
		const signature = event.headers["x-signature-ed25519"];
		const timestamp = event.headers["x-signature-timestamp"];

		if (!signature || !timestamp) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: "Invalid request signature" }),
			};
		}

		const isValid = await verifyDiscordRequest(
			event.body || "",
			signature,
			timestamp
		);
		if (!isValid) {
			return {
				statusCode: 401,
				body: JSON.stringify({ error: "Invalid request signature" }),
			};
		}

		// Initialize Discord client if not already initialized
		if (!client) {
			// Use environment variable in development, Parameter Store in production
			const token =
				process.env["ENVIRONMENT"] === "development"
					? process.env["DISCORD_BOT_TOKEN"]
					: await getParameter("/sparta/discord/bot_token");

			if (!token) {
				throw new Error("Discord bot token not found");
			}

			client = new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMessages,
				],
			}) as ExtendedClient;

			client.commands = new Collection();
			await loadCommands(client);
			await client.login(token);
		}

		// Parse the interaction
		const interaction = JSON.parse(event.body || "{}");

		// Handle ping
		if (interaction.type === 1) {
			return {
				statusCode: 200,
				body: JSON.stringify({ type: 1 }),
			};
		}

		// Handle command
		if (interaction.type === 2) {
			const command = client.commands.get(interaction.data.name);
			if (!command) {
				return {
					statusCode: 404,
					body: JSON.stringify({ error: "Command not found" }),
				};
			}

			try {
				const response = await command.execute(interaction);
				return {
					statusCode: 200,
					body: JSON.stringify(response),
				};
			} catch (error) {
				console.error("Error executing command:", error);
				return {
					statusCode: 500,
					body: JSON.stringify({
						type: 4,
						data: {
							content:
								"There was an error executing this command!",
							flags: 64,
						},
					}),
				};
			}
		}

		return {
			statusCode: 400,
			body: JSON.stringify({ error: "Unknown interaction type" }),
		};
	} catch (error) {
		console.error("Error handling request:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ error: "Internal server error" }),
		};
	}
};
