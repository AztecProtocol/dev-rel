/**
 * @fileoverview User repository for DynamoDB access
 * @description Implementation of User CRUD operations for DynamoDB
 * @module sparta/express/db/userRepository
 */

import { logger } from "@sparta/utils/logger.js";
import {
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	ScanCommand,
	DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import type { User } from "../routes/users/users.js";
import DynamoDBService from "@sparta/utils/dynamo-db.js";

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || "users";

// Instantiate the shared service for the users table
const dynamoDBService = new DynamoDBService(USERS_TABLE_NAME);

export class UserRepository {
	private client: DynamoDBDocumentClient;
	private tableName: string;

	constructor() {
		this.tableName = USERS_TABLE_NAME;
		// Get the client instance from the shared service
		this.client = dynamoDBService.getClient();
		logger.info(
			`UserRepository initialized using shared DynamoDBService for table: ${this.tableName}`
		);
	}

	// Get user by Discord ID
	async getUser(discordUserId: string): Promise<User | null> {
		try {
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { discordUserId },
			});

			const response = await this.client.send(command);
			return (response.Item as User) || null;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId },
				"Error getting user from DynamoDB"
			);
			return null;
		}
	}

	// Get user by verification ID - uses the flattened verificationId index
	async getUserByVerificationId(
		verificationId: string
	): Promise<User | null> {
		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: "verificationId-index",
				KeyConditionExpression: "verificationId = :verificationId",
				ExpressionAttributeValues: {
					":verificationId": verificationId,
				},
			});

			const response = await this.client.send(command);

			if (!response.Items || response.Items.length === 0) {
				return null;
			}

			const user = response.Items[0] as User;
			if (user.walletAddress) {
				user.walletAddress = user.walletAddress.toLowerCase();
			}
			return user;
		} catch (error: any) {
			logger.error(
				{ error: error.message, verificationId },
				"Error getting user by verification ID"
			);
			return null;
		}
	}

	// Get user by wallet address
	async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
		try {
			// Normalize wallet address (lowercase)
			const normalizedAddress = walletAddress.toLowerCase();

			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: "walletAddress-index", // This assumes a GSI on walletAddress
				KeyConditionExpression: "walletAddress = :walletAddress",
				ExpressionAttributeValues: {
					":walletAddress": normalizedAddress,
				},
			});

			const response = await this.client.send(command);

			if (response.Items && response.Items.length > 0) {
				return response.Items[0] as User;
			}

			return null;
		} catch (error: any) {
			logger.error(
				{ error: error.message, walletAddress },
				"Error getting user by wallet address"
			);
			return null;
		}
	}

	// Get all users
	async getAllUsers(): Promise<User[]> {
		try {
			const command = new ScanCommand({
				TableName: this.tableName,
			});

			const response = await this.client.send(command);
			return (response.Items as User[]) || [];
		} catch (error: any) {
			logger.error({ error: error.message }, "Error getting all users");
			return [];
		}
	}

	// Create a new user
	async createUser(user: User): Promise<User | null> {
		try {
			// Create a clean version of the user object for DynamoDB
			const dynamoUser: any = { ...user };

			// Handle wallet address - either lowercase it or remove it if null
			if (dynamoUser.walletAddress) {
				dynamoUser.walletAddress =
					dynamoUser.walletAddress.toLowerCase();
			} else {
				// Remove the walletAddress attribute entirely instead of storing null
				delete dynamoUser.walletAddress;
			}

			// Handle humanPassport fields - remove any null values to ensure proper indexing
			if (dynamoUser.humanPassport) {
				logger.debug(
					{
						dynamoUser: dynamoUser.humanPassport,
					},
					"Human passport in createUser"
				);
				const cleanHumanPassport: Record<string, any> = {};

				// Only keep non-null values
				for (const [key, value] of Object.entries(
					dynamoUser.humanPassport
				)) {
					if (value !== null && value !== undefined) {
						cleanHumanPassport[key] = value;
					}
				}

				// If humanPassport has values, replace it with the clean version
				if (Object.keys(cleanHumanPassport).length > 0) {
					dynamoUser.humanPassport = cleanHumanPassport;

					// Create a flattened verificationId at the top level for indexing
					if (cleanHumanPassport.verificationId) {
						dynamoUser.verificationId =
							cleanHumanPassport.verificationId;
					}
				} else {
					// If no values remain, remove the humanPassport object completely
					delete dynamoUser.humanPassport;
				}
			}

			const command = new PutCommand({
				TableName: this.tableName,
				Item: dynamoUser,
				ConditionExpression: "attribute_not_exists(discordUserId)",
			});

			await this.client.send(command);
			return user;
		} catch (error: any) {
			logger.error({ error: error.message, user }, "Error creating user");
			return null;
		}
	}

	// Update a user
	async updateUser(
		discordUserId: string,
		updates: Partial<User>
	): Promise<boolean> {
		try {
			// Build update and remove expressions
			const updateExpressions: string[] = [];
			const removeExpressions: string[] = [];
			const expressionAttributeNames: Record<string, string> = {};
			const expressionAttributeValues: Record<string, any> = {};

			// Process each update field to build the update expression
			for (const [key, value] of Object.entries(updates)) {
				// Skip discordUserId, it's the key
				if (key === "discordUserId") continue;

				if (value === null) {
					// For null values, remove the attribute instead of setting it to null
					expressionAttributeNames[`#${key}`] = key;
					removeExpressions.push(`#${key}`);
				} else if (
					key === "walletAddress" &&
					typeof value === "string"
				) {
					// Special handling for wallet address - normalize to lowercase
					expressionAttributeValues[`:${key}`] = value.toLowerCase();
					expressionAttributeNames[`#${key}`] = key;
					updateExpressions.push(`#${key} = :${key}`);
				} else if (
					key === "humanPassport" &&
					typeof value === "object"
				) {
					// Handle humanPassport specially
					const humanPassport = value as any;
					expressionAttributeNames[`#${key}`] = key;

					// Create a clean copy without null values
					const cleanHumanPassport: Record<string, any> = {};
					for (const [hpKey, hpValue] of Object.entries(
						humanPassport
					)) {
						if (hpValue !== null) {
							cleanHumanPassport[hpKey] = hpValue;
						}
					}

					expressionAttributeValues[`:${key}`] = cleanHumanPassport;
					updateExpressions.push(`#${key} = :${key}`);

					// If verificationId exists in humanPassport, add it as a top-level attribute
					if (cleanHumanPassport.verificationId) {
						expressionAttributeValues[`:verificationId`] =
							cleanHumanPassport.verificationId;
						expressionAttributeNames[`#verificationId`] =
							"verificationId";
						updateExpressions.push(
							`#verificationId = :verificationId`
						);
					}
				} else {
					// Normal case
					expressionAttributeValues[`:${key}`] = value;
					expressionAttributeNames[`#${key}`] = key;
					updateExpressions.push(`#${key} = :${key}`);
				}
			}

			// If nothing to update or remove, return success
			if (
				updateExpressions.length === 0 &&
				removeExpressions.length === 0
			) {
				return true;
			}

			// Build the UpdateExpression
			let updateExpression = "";
			if (updateExpressions.length > 0) {
				updateExpression += `SET ${updateExpressions.join(", ")}`;
			}

			if (removeExpressions.length > 0) {
				updateExpression += updateExpressions.length > 0 ? " " : "";
				updateExpression += `REMOVE ${removeExpressions.join(", ")}`;
			}

			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { discordUserId },
				UpdateExpression: updateExpression,
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
				ReturnValues: "UPDATED_NEW",
			});

			await this.client.send(command);
			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId, updates },
				"Error updating user"
			);
			return false;
		}
	}

	// Delete a user
	async deleteUser(discordUserId: string): Promise<boolean> {
		try {
			const command = new DeleteCommand({
				TableName: this.tableName,
				Key: { discordUserId },
			});

			await this.client.send(command);
			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId },
				"Error deleting user"
			);
			return false;
		}
	}
}

// Export a singleton instance of the repository
export const userRepository = new UserRepository();
