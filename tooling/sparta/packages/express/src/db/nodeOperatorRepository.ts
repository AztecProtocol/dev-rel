import {
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	ScanCommand,
	DynamoDBDocumentClient, // Keep this for type hint
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@sparta/utils";
import type { NodeOperator } from "../domain/operators/service";
import DynamoDBService from "@sparta/utils/dynamo-db.js"; // Import the shared service

const NODE_OPERATORS_TABLE_NAME =
	process.env.NODE_OPERATORS_TABLE_NAME || "sparta-node-operators-dev";
const WALLET_ADDRESS_INDEX_NAME = "WalletAddressIndex";
const DISCORD_USERNAME_INDEX_NAME = "DiscordUsernameIndex";

// Instantiate the shared service for the node operators table
const dynamoDBService = new DynamoDBService(NODE_OPERATORS_TABLE_NAME);

export class NodeOperatorRepository {
	private client: DynamoDBDocumentClient;
	private tableName: string;

	constructor() {
		this.tableName = NODE_OPERATORS_TABLE_NAME;
		// Get the client instance from the shared service
		this.client = dynamoDBService.getClient();
		logger.info(
			`NodeOperatorRepository initialized using shared DynamoDBService for table: ${this.tableName}`
		);
	}

	async findAll(pageToken?: string): Promise<{ operators: NodeOperator[]; nextPageToken?: string }> {
		try {
			const ITEMS_PER_PAGE = 100;
			
			// Build the scan command
			const scanParams: any = {
				TableName: this.tableName,
				Limit: ITEMS_PER_PAGE
			};
			
			// If we have a page token, use it as the ExclusiveStartKey
			if (pageToken) {
				try {
					const decodedToken = JSON.parse(Buffer.from(pageToken, 'base64').toString());
					scanParams.ExclusiveStartKey = decodedToken;
				} catch (error) {
					logger.error({ error, pageToken }, "Invalid page token format");
				}
			}
			
			const command = new ScanCommand(scanParams);
			const response = await this.client.send(command);
			
			// Generate the next page token if LastEvaluatedKey exists
			let nextPageToken: string | undefined = undefined;
			if (response.LastEvaluatedKey) {
				nextPageToken = Buffer.from(
					JSON.stringify(response.LastEvaluatedKey)
				).toString('base64');
			}
			
			return {
				operators: (response.Items ?? []) as NodeOperator[],
				nextPageToken,
			};
		} catch (error) {
			logger.error(
				{ error, tableName: this.tableName },
				"Error scanning NodeOperators table in repository"
			);
			throw new Error("Repository failed to retrieve node operators.");
		}
	}

	async findByDiscordId(
		discordId: string
	): Promise<NodeOperator | undefined> {
		try {
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { discordId },
			});
			const response = await this.client.send(command);
			return response.Item as NodeOperator | undefined;
		} catch (error) {
			logger.error(
				{ error, discordId, tableName: this.tableName },
				"Error retrieving NodeOperator by Discord ID in repository"
			);
			throw new Error(
				"Repository failed to retrieve node operator by Discord ID."
			);
		}
	}

	async findByDiscordUsername(
		discordUsername: string
	): Promise<NodeOperator | undefined> {
		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: DISCORD_USERNAME_INDEX_NAME,
				KeyConditionExpression: "discordUsername = :discordUsername",
				ExpressionAttributeValues: {
					":discordUsername": discordUsername,
				},
			});
			const response = await this.client.send(command);
			return response.Items && response.Items.length > 0
				? (response.Items[0] as NodeOperator)
				: undefined;
		} catch (error) {
			logger.error(
				{ error, discordUsername, tableName: this.tableName },
				"Error retrieving NodeOperator by Discord username in repository"
			);
			throw new Error(
				"Repository failed to retrieve node operator by Discord username."
			);
		}
	}

	async findByWalletAddress(
		walletAddress: string
	): Promise<NodeOperator | undefined> {
		try {
			// Consider normalizing the address if needed (e.g., to lowercase)
			// const normalizedAddress = walletAddress.toLowerCase();
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: WALLET_ADDRESS_INDEX_NAME,
				KeyConditionExpression: "walletAddress = :walletAddress",
				ExpressionAttributeValues: {
					":walletAddress": walletAddress, // Use normalizedAddress if normalizing
				},
			});
			const response = await this.client.send(command);
			return response.Items && response.Items.length > 0
				? (response.Items[0] as NodeOperator)
				: undefined;
		} catch (error) {
			logger.error(
				{ error, walletAddress, tableName: this.tableName },
				"Error querying NodeOperator by wallet address in repository"
			);
			throw new Error(
				"Repository failed to retrieve node operator by address."
			);
		}
	}

	async countAll(): Promise<number> {
		try {
			const command = new ScanCommand({
				TableName: this.tableName,
				Select: "COUNT",
			});
			const response = await this.client.send(command);
			return response.Count ?? 0;
		} catch (error) {
			logger.error(
				{ error, tableName: this.tableName },
				"Error counting NodeOperators in repository"
			);
			throw new Error("Repository failed to count node operators.");
		}
	}

	async create(
		discordId: string,
		walletAddress: string,
		discordUsername?: string,
		isApproved?: boolean
	): Promise<NodeOperator> {
		const now = Date.now();
		const newOperator: NodeOperator = {
			discordId,
			walletAddress, // Consider normalizing address before saving
			...(discordUsername && { discordUsername }),
			...(isApproved !== undefined && { isApproved }),
			createdAt: now,
			updatedAt: now,
		};

		try {
			const command = new PutCommand({
				TableName: this.tableName,
				Item: newOperator,
				ConditionExpression: "attribute_not_exists(discordId)",
			});
			await this.client.send(command);
			logger.info(
				{ discordId, walletAddress, discordUsername, tableName: this.tableName },
				"Created new NodeOperator in repository"
			);
			return newOperator;
		} catch (error: any) {
			logger.error(
				{ error, discordId, walletAddress, discordUsername, tableName: this.tableName },
				"Error creating NodeOperator in repository"
			);
			// Re-throw specific error types if needed for service layer handling
			if (error.name === "ConditionalCheckFailedException") {
				throw new Error(
					`Node operator with Discord ID ${discordId} already exists.`
				);
			}
			throw new Error("Repository failed to create node operator.");
		}
	}

	async updateWallet(
		discordId: string,
		newWalletAddress: string
	): Promise<boolean> {
		try {
			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { discordId },
				UpdateExpression:
					"SET walletAddress = :walletAddress, updatedAt = :updatedAt",
				ConditionExpression: "attribute_exists(discordId)",
				ExpressionAttributeValues: {
					":walletAddress": newWalletAddress, // Consider normalizing
					":updatedAt": Date.now(),
				},
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ discordId, newWalletAddress, tableName: this.tableName },
				"Updated NodeOperator wallet address in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					discordId,
					newWalletAddress,
					tableName: this.tableName,
				},
				"Error updating NodeOperator wallet address in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ discordId },
					"NodeOperator not found for update wallet operation"
				);
				return false;
			}
			throw error;
		}
	}

	async updateApprovalStatus(
		discordId: string,
		isApproved: boolean
	): Promise<boolean> {
		try {
			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { discordId },
				UpdateExpression:
					"SET isApproved = :isApproved, updatedAt = :updatedAt",
				ConditionExpression: "attribute_exists(discordId)",
				ExpressionAttributeValues: {
					":isApproved": isApproved,
					":updatedAt": Date.now(),
				},
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ discordId, isApproved, tableName: this.tableName },
				"Updated NodeOperator approval status in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					discordId,
					isApproved,
					tableName: this.tableName,
				},
				"Error updating NodeOperator approval status in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ discordId },
					"NodeOperator not found for update approval status operation"
				);
				return false;
			}
			throw error;
		}
	}

	async deleteByDiscordId(discordId: string): Promise<boolean> {
		try {
			const command = new DeleteCommand({
				TableName: this.tableName,
				Key: { discordId },
				ConditionExpression: "attribute_exists(discordId)",
			});
			await this.client.send(command);
			logger.info(
				{ discordId, tableName: this.tableName },
				"Deleted NodeOperator in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{ error, discordId, tableName: this.tableName },
				"Error deleting NodeOperator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ discordId },
					"NodeOperator not found for delete operation"
				);
				return false;
			}
			throw error;
		}
	}
}

export const nodeOperatorRepository = new NodeOperatorRepository();
export default nodeOperatorRepository;
