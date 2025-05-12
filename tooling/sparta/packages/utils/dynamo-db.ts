/**
 * @fileoverview DynamoDB database for session management during verification.
 * @description Stores session data associated with a verification process in AWS DynamoDB.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	// ScanCommand, // Removed unused import
	// BatchWriteCommand // Removed unused import
} from "@aws-sdk/lib-dynamodb";
import { logger } from "./logger.js";

// Export the Session interface
export interface Session {
	sessionId: string; // Primary key
	discordUserId: string; // Provided when session is initiated (likely by the bot)
	walletAddress: string | null;
	signature: string | null; // Might be stored after verification attempt
	verified: boolean;
	roleAssigned: boolean;
	score: number | null; // Score from passport/verification
	createdAt: number; // Timestamp (ms) for expiration
	lastScoreTimestamp: number | null; // Timestamp when the score was last updated
	status: string; // Current status of the verification process
	interactionToken?: string; // Added: Token for editing the original Discord interaction reply
}

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes session validity

class DynamoDBService {
	private client: DynamoDBDocumentClient;
	private tableName: string;
	private isLocal: boolean;

	constructor(tableName: string) {
		this.tableName = tableName;
		this.isLocal = process.env.LOCAL_DYNAMO_DB === "true";

		// Create the DynamoDB client
		const options: any = {};
		// Use local DynamoDB when running locally
		if (this.isLocal) {
			options.endpoint =
				process.env.DYNAMODB_LOCAL_ENDPOINT || "http://localhost:8000";
			logger.info(`Using local DynamoDB at ${options.endpoint}`);
		}

		const dynamoClient = new DynamoDBClient(options);
		this.client = DynamoDBDocumentClient.from(dynamoClient);
	}

	// Expose the underlying client for more complex queries/scans
	public getClient(): DynamoDBDocumentClient {
		return this.client;
	}

	/**
	 * Retrieves a session if it exists and hasn't expired.
	 * @param sessionId The session ID to look up.
	 * @returns The session object or undefined.
	 */
	public async getSession(sessionId: string): Promise<Session | undefined> {
		try {
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { sessionId },
			});

			const response = await this.client.send(command);

			if (!response.Item) {
				return undefined;
			}

			const session = response.Item as Session;

			// Check if session has expired
			if (Date.now() - session.createdAt > SESSION_TIMEOUT_MS) {
				// Delete expired session
				const deleteCommand = new DeleteCommand({
					TableName: this.tableName,
					Key: { sessionId },
				});

				await this.client.send(deleteCommand);
				return undefined;
			}

			return session;
		} catch (error) {
			logger.error(
				{ error, sessionId },
				"Error retrieving session from DynamoDB"
			);
			return undefined;
		}
	}

	/**
	 * Updates specific fields of an existing session.
	 * @param sessionId The ID of the session to update.
	 * @param updates An object containing fields to update.
	 * @returns True if the session was found and updated, false otherwise.
	 */
	public async updateSession(
		sessionId: string,
		updates: Partial<
			Omit<Session, "sessionId" | "discordUserId" | "createdAt">
		>
	): Promise<boolean> {
		try {
			// First check if session exists and is not expired
			const session = await this.getSession(sessionId);
			if (!session) {
				logger.warn(
					{ sessionId },
					"Attempted to update non-existent or expired session."
				);
				return false;
			}

			// Build update expression
			const updateExpressions: string[] = [];
			const expressionAttributeNames: Record<string, string> = {};
			const expressionAttributeValues: Record<string, any> = {};

			Object.entries(updates).forEach(([key, value]) => {
				updateExpressions.push(`#${key} = :${key}`);
				expressionAttributeNames[`#${key}`] = key;
				expressionAttributeValues[`:${key}`] = value;
			});

			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { sessionId },
				UpdateExpression: `SET ${updateExpressions.join(", ")}`,
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
			});

			await this.client.send(command);
			return true;
		} catch (error) {
			logger.error(
				{ error, sessionId },
				"Error updating session in DynamoDB"
			);
			return false;
		}
	}

	/**
	 * Updates the wallet address for a given session.
	 * @param sessionId The session ID.
	 * @param walletAddress The wallet address to store.
	 * @returns True if successful, false otherwise.
	 */
	public async updateWalletAddress(
		sessionId: string,
		walletAddress: string
	): Promise<boolean> {
		return this.updateSession(sessionId, { walletAddress });
	}

	/**
	 * Updates the signature for a given session.
	 * @param sessionId The session ID.
	 * @param signature The signature to store.
	 * @returns True if successful, false otherwise.
	 */
	public async updateSignature(
		sessionId: string,
		signature: string
	): Promise<boolean> {
		return this.updateSession(sessionId, { signature });
	}

	/**
	 * Updates the passport score for a given session.
	 * @param sessionId The session ID.
	 * @param score The score to store.
	 * @returns True if successful, false otherwise.
	 */
	public async updatePassportScore(
		sessionId: string,
		score: number | null
	): Promise<boolean> {
		return this.updateSession(sessionId, { score });
	}

	/**
	 * Marks the role as assigned for a given session.
	 * @param sessionId The session ID.
	 * @returns True if successful, false otherwise.
	 */
	public async markRoleAssigned(sessionId: string): Promise<boolean> {
		return this.updateSession(sessionId, { roleAssigned: true });
	}

	/**
	 * Updates the verification status and score for a given session.
	 * @param sessionId The session ID.
	 * @param verified The verification status.
	 * @param score The associated score (optional).
	 * @returns True if successful, false otherwise.
	 */
	public async updateVerificationStatus(
		sessionId: string,
		verified: boolean,
		score: number | null = null
	): Promise<boolean> {
		return this.updateSession(sessionId, { verified, score });
	}

	/**
	 * Creates a new session.
	 * @param sessionId A unique ID for the session.
	 * @param discordUserId The Discord user ID associated with the session.
	 * @param interactionToken The token from the original Discord interaction.
	 * @returns The created session object or undefined if creation failed.
	 */
	public async createSession(
		sessionId: string,
		discordUserId: string,
		interactionToken: string
	): Promise<Session | undefined> {
		try {
			logger.info(
				{
					sessionId,
					discordUserId,
					interactionToken,
					isLocal: this.isLocal,
					tableName: this.tableName,
					endpoint: this.isLocal
						? process.env.DYNAMODB_LOCAL_ENDPOINT
						: "AWS DynamoDB",
				},
				"Starting session creation in DynamoDB"
			);

			// Check if session already exists
			logger.debug({ sessionId }, "Checking if session already exists");
			const existingSession = await this.getSession(sessionId);
			if (existingSession) {
				logger.warn(
					{ sessionId },
					"Session ID collision detected during creation."
				);
				return undefined;
			}
			logger.debug(
				{ sessionId },
				"No existing session found, creating new one"
			);

			const newSession: Session = {
				sessionId,
				discordUserId,
				walletAddress: null,
				signature: null,
				verified: false,
				roleAssigned: false,
				score: null,
				createdAt: Date.now(),
				lastScoreTimestamp: null,
				status: "pending", // Initial status
				interactionToken,
			};

			logger.debug(
				{ sessionId, session: newSession },
				"Preparing to send PutCommand"
			);

			const command = new PutCommand({
				TableName: this.tableName,
				Item: newSession,
			});

			logger.debug(
				{ sessionId, tableName: this.tableName },
				"Sending PutCommand to DynamoDB"
			);
			await this.client.send(command);
			logger.info(
				{ sessionId, discordUserId },
				"Created new verification session in DynamoDB."
			);
			return newSession;
		} catch (err: any) {
			// Type the error as any to access properties
			logger.error(
				{
					error: err,
					sessionId,
					discordUserId,
					errorName: err.name,
					errorMessage: err.message,
					errorStack: err.stack,
					isLocal: this.isLocal,
					tableName: this.tableName,
				},
				"Error creating session in DynamoDB"
			);
			return undefined;
		}
	}

	/**
	 * Finds the most recent, non-expired session for a Discord user.
	 * @param discordUserId The Discord user ID to search for.
	 * @returns The most recent session object or undefined if none found.
	 */
	public async findSessionByDiscordId(
		discordUserId: string
	): Promise<Session | undefined> {
		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: "DiscordUserIdIndex", // Secondary index on discordUserId
				KeyConditionExpression: "discordUserId = :discordUserId",
				ExpressionAttributeValues: {
					":discordUserId": discordUserId,
				},
			});

			const response = await this.client.send(command);

			if (!response.Items || response.Items.length === 0) {
				return undefined;
			}

			// Get the most recent session
			const sessions = response.Items as Session[];
			const validSessions = sessions.filter(
				(session) =>
					Date.now() - session.createdAt <= SESSION_TIMEOUT_MS
			);

			if (validSessions.length === 0) {
				return undefined;
			}

			// Sort by creation time (newest first)
			return validSessions.sort((a, b) => b.createdAt - a.createdAt)[0];
		} catch (error) {
			logger.error(
				{ error, discordUserId },
				"Error finding session by Discord ID in DynamoDB"
			);
			return undefined;
		}
	}
}

export default DynamoDBService;
