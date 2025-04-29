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
} from "@aws-sdk/lib-dynamodb";
import type { User } from "../routes/users.js";
import DynamoDBService from "@sparta/utils/dynamo-db.js";

// Type for extended DynamoDB with user methods
interface ExtendedDynamoDB {
	getUser(discordUserId: string): Promise<User | null>;
	getUserByVerificationId(verificationId: string): Promise<User | null>;
	getUserByWalletAddress(walletAddress: string): Promise<User | null>;
	getAllUsers(): Promise<User[]>;
	createUser(user: User): Promise<User | null>;
	updateUser(discordUserId: string, updates: Partial<User>): Promise<boolean>;
	deleteUser(discordUserId: string): Promise<boolean>;
	getClient(): any;
}

// Get the dynamoDB instance with our extended type
const dynamoDB = new DynamoDBService(process.env.USERS_TABLE_NAME || "users");

const extendedDynamoDB = dynamoDB as unknown as ExtendedDynamoDB;

logger.info("dynamoDB config", dynamoDB.getClient().config);

// Extend the DynamoDB service with user operations
export function extendDynamoDBWithUserMethods(): void {
	// Get user by Discord ID
	extendedDynamoDB.getUser = async (
		discordUserId: string
	): Promise<User | null> => {
		try {
			const command = new GetCommand({
				TableName: process.env.USERS_TABLE_NAME || "users",
				Key: { discordUserId },
			});

			const response = await dynamoDB.getClient().send(command);
			return (response.Item as User) || null;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId },
				"Error getting user from DynamoDB"
			);
			return null;
		}
	};

	// Get user by verification ID - uses the flattened verificationId index
	extendedDynamoDB.getUserByVerificationId = async (
		verificationId: string
	): Promise<User | null> => {
		try {
			const command = new QueryCommand({
				TableName: process.env.USERS_TABLE_NAME || "users",
				IndexName: "verificationId-index",
				KeyConditionExpression: "verificationId = :verificationId",
				ExpressionAttributeValues: {
					":verificationId": verificationId,
				},
			});

			const response = await dynamoDB.getClient().send(command);

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
	};

	// Get user by wallet address
	extendedDynamoDB.getUserByWalletAddress = async (
		walletAddress: string
	): Promise<User | null> => {
		try {
			// Normalize wallet address (lowercase)
			const normalizedAddress = walletAddress.toLowerCase();

			const command = new QueryCommand({
				TableName: process.env.USERS_TABLE_NAME || "users",
				IndexName: "walletAddress-index", // This assumes a GSI on walletAddress
				KeyConditionExpression: "walletAddress = :walletAddress",
				ExpressionAttributeValues: {
					":walletAddress": normalizedAddress,
				},
			});

			const response = await dynamoDB.getClient().send(command);

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
	};

	// Get all users
	extendedDynamoDB.getAllUsers = async (): Promise<User[]> => {
		try {
			const command = new ScanCommand({
				TableName: process.env.USERS_TABLE_NAME,
			});

			const response = await dynamoDB.getClient().send(command);
			return (response.Items as User[]) || [];
		} catch (error: any) {
			logger.error({ error: error.message }, "Error getting all users");
			return [];
		}
	};

	// Create a new user
	extendedDynamoDB.createUser = async (user: User): Promise<User | null> => {
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
				TableName: process.env.USERS_TABLE_NAME,
				Item: dynamoUser,
				ConditionExpression: "attribute_not_exists(discordUserId)",
			});

			await dynamoDB.getClient().send(command);
			return user;
		} catch (error: any) {
			logger.error({ error: error.message, user }, "Error creating user");
			return null;
		}
	};

	// Update a user
	extendedDynamoDB.updateUser = async (
		discordUserId: string,
		updates: Partial<User>
	): Promise<boolean> => {
		try {
			// Create a clean version of the updates
			const cleanUpdates: Record<string, any> = {};
			const removeExpressions: string[] = [];

			// Build update and remove expressions
			const updateExpressions: string[] = [];
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
				TableName: process.env.USERS_TABLE_NAME,
				Key: { discordUserId },
				UpdateExpression: updateExpression,
				ExpressionAttributeNames: expressionAttributeNames,
				ExpressionAttributeValues: expressionAttributeValues,
				ReturnValues: "UPDATED_NEW",
			});

			await dynamoDB.getClient().send(command);
			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId, updates },
				"Error updating user"
			);
			return false;
		}
	};

	// Delete a user
	extendedDynamoDB.deleteUser = async (
		discordUserId: string
	): Promise<boolean> => {
		try {
			const command = new DeleteCommand({
				TableName: process.env.USERS_TABLE_NAME,
				Key: { discordUserId },
			});

			await dynamoDB.getClient().send(command);
			return true;
		} catch (error: any) {
			logger.error(
				{ error: error.message, discordUserId },
				"Error deleting user"
			);
			return false;
		}
	};
}

// Export the extended dynamoDB for use in other modules
export { extendedDynamoDB };

// Export function to initialize - this will be called during app startup
export function initializeUserRepository(): void {
	extendDynamoDBWithUserMethods();
	logger.info("User repository initialized");
}
