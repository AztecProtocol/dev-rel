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
				error,
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
				error,
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
		logger.info({
			message: "findByDiscordUsername called",
			inputUsername: discordUsername,
			usernameLength: discordUsername?.length,
			tableName: this.tableName,
			indexName: DISCORD_USERNAME_INDEX_NAME
		}, "Exact input to findByDiscordUsername");

		try {
			try {
				// First try to use the index if it exists
				const command = new QueryCommand({
					TableName: this.tableName,
					IndexName: DISCORD_USERNAME_INDEX_NAME,
					KeyConditionExpression: "discordUsername = :discordUsername",
					ExpressionAttributeValues: {
						":discordUsername": discordUsername,
					},
				});
				logger.info({ command }, "Attempting GSI QueryCommand");
				const response = await this.client.send(command);
				logger.info({ responseFromGSIQuery: response }, "Received response from GSI QueryCommand");

				if (response.Items && response.Items.length > 0) {
					logger.info({ foundItem: response.Items[0] }, "Found operator via GSI query");
					return response.Items[0] as NodeOperator;
				} else {
					logger.info("No items found via GSI query for the given username.");
					// Proceed to return undefined, will be caught by outer logic or fallback if index error occurred
				}
			} catch (indexError: any) {
				logger.error({ indexError, details: JSON.stringify(indexError, Object.getOwnPropertyNames(indexError)) }, "Error during GSI Query attempt");
				// If the index doesn't exist yet or is backfilling, fall back to scan
				if (indexError.name === "ValidationException" && 
					indexError.message && 
					(indexError.message.includes("specified index") || 
					 indexError.message.includes("Cannot read from backfilling global secondary index"))) {
					logger.warn(
						{ indexError, discordUsername, tableName: this.tableName },
						"Index not ready or backfilling, falling back to scan for Discord username lookup"
					);
					
					// Fall back to scan
					const scanCommand = new ScanCommand({
						TableName: this.tableName,
						FilterExpression: "discordUsername = :discordUsername",
						ExpressionAttributeValues: {
							":discordUsername": discordUsername,
						},
					});
					logger.info({ scanCommand }, "Attempting ScanCommand (fallback)");
					const scanResponse = await this.client.send(scanCommand);
					logger.info({ scanResponseFromFallback: scanResponse }, "Received response from fallback ScanCommand");

					if (scanResponse.Items && scanResponse.Items.length > 0) {
						logger.info({ foundItem: scanResponse.Items[0] }, "Found operator via fallback scan");
						return scanResponse.Items[0] as NodeOperator;
					} else {
						logger.info("No items found via fallback scan for the given username.");
						return undefined;
					}
				} else {
					logger.error("Re-throwing unhandled GSI query error (not a known ValidationException for fallback).");
					// Re-throw if it's a different error
					throw indexError;
				}
			}
		} catch (error) { // This catches errors re-thrown from the inner try/catch or direct errors if the GSI query itself failed unexpectedly.
			logger.error(
				{ error, details: JSON.stringify(error, Object.getOwnPropertyNames(error)), discordUsername, tableName: this.tableName },
				"Error retrieving NodeOperator by Discord username in repository (outer catch)"
			);
			throw new Error( // This will be caught by the service/route layer
				`Repository failed to retrieve node operator by Discord username. Original error: ${(error as Error).message}`
			);
		}
		// This line should ideally not be reached if all paths return or throw.
		// If the GSI query returned no items and no error occurred, it should have returned undefined.
		logger.warn("findByDiscordUsername reached end of function without returning, returning undefined. This indicates a potential logic flaw if an operator was expected.");
		return undefined;
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
			// Use DynamoDB's COUNT select to efficiently count items without transferring data
			let totalCount = 0;
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Select: "COUNT", // Only return the count, not the items
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				totalCount += response.Count || 0;
				lastEvaluatedKey = response.LastEvaluatedKey;
				
				logger.debug(
					{ 
						batchCount: response.Count || 0,
						runningTotal: totalCount,
						hasMoreItems: !!lastEvaluatedKey
					},
					"Counting NodeOperators efficiently with COUNT select"
				);
			} while (lastEvaluatedKey);
			
			return totalCount;
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
		discordUsername: string,
		isApproved?: boolean
	): Promise<NodeOperator> {
		const now = Date.now();
		const newOperator: NodeOperator = {
			discordId,
			walletAddress, // Consider normalizing address before saving
			discordUsername,
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

	async updateSlashedStatus(
		discordId: string,
		wasSlashed: boolean
	): Promise<boolean> {
		try {
			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { discordId },
				UpdateExpression:
					"SET wasSlashed = :wasSlashed, updatedAt = :updatedAt",
				ConditionExpression: "attribute_exists(discordId)",
				ExpressionAttributeValues: {
					":wasSlashed": wasSlashed,
					":updatedAt": Date.now(),
				},
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ discordId, wasSlashed, tableName: this.tableName },
				"Updated NodeOperator slashed status in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					discordId,
					wasSlashed,
					tableName: this.tableName,
				},
				"Error updating NodeOperator slashed status in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ discordId },
					"NodeOperator not found for update slashed status operation"
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

	/**
	 * Counts all node operators that have empty validators arrays and are approved.
	 * Uses DynamoDB FilterExpression with COUNT select for efficient counting.
	 * @returns The count of approved node operators with empty validators arrays.
	 */
	async countApprovedOperatorsWithoutValidators(): Promise<number> {
		try {
			// Get the validators table name from environment
			const VALIDATORS_TABLE_NAME = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
			
			// First, get all approved operators
			const approvedOperatorIds = new Set<string>();
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "discordId",
					FilterExpression: "isApproved = :approved",
					ExpressionAttributeValues: {
						":approved": true
					}
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					for (const item of response.Items) {
						if (item.discordId) {
							approvedOperatorIds.add(item.discordId);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			logger.debug(
				{ totalApprovedOperators: approvedOperatorIds.size },
				"Found approved operators"
			);
			
			// Get all operators that have validators
			const operatorsWithValidators = new Set<string>();
			lastEvaluatedKey = undefined;
			
			do {
				const scanParams: any = {
					TableName: VALIDATORS_TABLE_NAME,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "nodeOperatorId",
					FilterExpression: "attribute_exists(nodeOperatorId) AND nodeOperatorId <> :empty",
					ExpressionAttributeValues: {
						":empty": ""
					}
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					for (const item of response.Items) {
						if (item.nodeOperatorId) {
							operatorsWithValidators.add(item.nodeOperatorId);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			// Count approved operators without validators
			let approvedWithoutValidators = 0;
			for (const operatorId of approvedOperatorIds) {
				if (!operatorsWithValidators.has(operatorId)) {
					approvedWithoutValidators++;
				}
			}
			
			logger.info(
				{ 
					totalApproved: approvedOperatorIds.size,
					approvedWithValidators: operatorsWithValidators.size,
					approvedWithoutValidators
				},
				"Counted approved operators without validators"
			);
			
			return approvedWithoutValidators;
		} catch (error) {
			logger.error(
				error,
				"Error counting approved NodeOperators without validators in repository"
			);
			throw new Error("Repository failed to count approved node operators without validators.");
		}
	}

	/**
	 * Counts all node operators that have empty validators arrays (regardless of approval status).
	 * Uses DynamoDB FilterExpression with COUNT select for efficient counting.
	 * @returns The count of all node operators with empty validators arrays.
	 */
	async countAllOperatorsWithoutValidators(): Promise<number> {
		try {
			// Get the validators table name from environment
			const VALIDATORS_TABLE_NAME = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
			
			// First, get all operators
			const allOperatorIds = new Set<string>();
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "discordId"
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					for (const item of response.Items) {
						if (item.discordId) {
							allOperatorIds.add(item.discordId);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			logger.debug(
				{ totalOperators: allOperatorIds.size },
				"Found all operators"
			);
			
			// Get all operators that have validators
			const operatorsWithValidators = new Set<string>();
			lastEvaluatedKey = undefined;
			
			do {
				const scanParams: any = {
					TableName: VALIDATORS_TABLE_NAME,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "nodeOperatorId",
					FilterExpression: "attribute_exists(nodeOperatorId) AND nodeOperatorId <> :empty",
					ExpressionAttributeValues: {
						":empty": ""
					}
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					for (const item of response.Items) {
						if (item.nodeOperatorId) {
							operatorsWithValidators.add(item.nodeOperatorId);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			// Count all operators without validators
			let operatorsWithoutValidators = 0;
			for (const operatorId of allOperatorIds) {
				if (!operatorsWithValidators.has(operatorId)) {
					operatorsWithoutValidators++;
				}
			}
			
			logger.info(
				{ 
					totalOperators: allOperatorIds.size,
					operatorsWithValidators: operatorsWithValidators.size,
					operatorsWithoutValidators
				},
				"Counted all operators without validators"
			);
			
			return operatorsWithoutValidators;
		} catch (error) {
			logger.error(
				error,
				"Error counting all NodeOperators without validators in repository"
			);
			throw new Error("Repository failed to count all node operators without validators.");
		}
	}

	/**
	 * Counts all node operators that have more than one validator.
	 * Uses DynamoDB FilterExpression with COUNT select for efficient counting.
	 * @returns The count of node operators with multiple validators.
	 */
	async countOperatorsWithMultipleValidators(): Promise<number> {
		try {
			// Get the validators table name from environment
			const VALIDATORS_TABLE_NAME = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
			
			// Get all validators grouped by nodeOperatorId
			const operatorValidatorCounts = new Map<string, number>();
			let lastEvaluatedKey: any = undefined;
			
			// Scan through all validators and count per operator
			do {
				const scanParams: any = {
					TableName: VALIDATORS_TABLE_NAME,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "nodeOperatorId",
					// Only count validators that have a nodeOperatorId
					FilterExpression: "attribute_exists(nodeOperatorId) AND nodeOperatorId <> :empty",
					ExpressionAttributeValues: {
						":empty": ""
					}
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				// Count validators per operator
				if (response.Items) {
					for (const item of response.Items) {
						if (item.nodeOperatorId) {
							const count = operatorValidatorCounts.get(item.nodeOperatorId) || 0;
							operatorValidatorCounts.set(item.nodeOperatorId, count + 1);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
				
				logger.debug(
					{ 
						batchSize: response.Items?.length || 0,
						uniqueOperatorsSoFar: operatorValidatorCounts.size,
						hasMoreItems: !!lastEvaluatedKey
					},
					"Scanning validators to count operators with multiple validators"
				);
			} while (lastEvaluatedKey);
			
			// Count operators with more than one validator
			let operatorsWithMultiple = 0;
			for (const [operatorId, validatorCount] of operatorValidatorCounts) {
				if (validatorCount > 1) {
					operatorsWithMultiple++;
					logger.debug(
						{ operatorId, validatorCount },
						"Found operator with multiple validators"
					);
				}
			}
			
			logger.info(
				{ 
					totalOperatorsWithValidators: operatorValidatorCounts.size,
					operatorsWithMultipleValidators: operatorsWithMultiple
				},
				"Completed counting operators with multiple validators"
			);
			
			return operatorsWithMultiple;
		} catch (error) {
			logger.error(
				error,
				"Error counting NodeOperators with multiple validators in repository"
			);
			throw new Error("Repository failed to count node operators with multiple validators.");
		}
	}
}

export const nodeOperatorRepository = new NodeOperatorRepository();
export default nodeOperatorRepository;
