import { getParameter } from "./parameter-store.js";
import { verifyKey } from "discord-interactions";

export async function verifyDiscordRequest(
	body: string,
	signature: string,
	timestamp: string
): Promise<boolean> {
	try {
		// Use environment variable in development, Parameter Store in production
		const publicKey =
			process.env["ENVIRONMENT"] === "development"
				? process.env["DISCORD_PUBLIC_KEY"]
				: await getParameter("/sparta/discord/public_key");

		if (!publicKey) {
			throw new Error("Discord public key not found");
		}

		return verifyKey(body, signature, timestamp, publicKey);
	} catch (error) {
		console.error("Error verifying Discord request:", error);
		return false;
	}
}
