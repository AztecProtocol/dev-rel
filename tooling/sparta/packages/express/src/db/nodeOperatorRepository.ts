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
const DISCORD_ID_INDEX_NAME = "DiscordIdIndex";
const X_ID_INDEX_NAME = "XIdIndex";

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

	async findAll(pageToken?: string, limit: number = 100): Promise<{ operators: NodeOperator[]; nextPageToken?: string }> {
		try {
			// Build the scan command
			const scanParams: any = {
				TableName: this.tableName,
				Limit: limit
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

	async findByAddress(
		address: string
	): Promise<NodeOperator | undefined> {
		try {
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { address },
			});
			const response = await this.client.send(command);
			return response.Item as NodeOperator | undefined;
		} catch (error) {
			logger.error(
				error,
				"Error retrieving NodeOperator by address in repository"
			);
			throw new Error(
				"Repository failed to retrieve node operator by address."
			);
		}
	}

	async findByDiscordId(
		discordId: string
	): Promise<NodeOperator | undefined> {
		try {
			// Use the GSI to query by discordId
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: DISCORD_ID_INDEX_NAME,
				KeyConditionExpression: "discordId = :discordId",
				ExpressionAttributeValues: {
					":discordId": discordId,
				},
				Limit: 1, // We expect only one operator per discordId
			});
			const response = await this.client.send(command);
			
			if (response.Items && response.Items.length > 0) {
				return response.Items[0] as NodeOperator;
			}
			return undefined;
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
		operatorData: NodeOperator
	): Promise<NodeOperator> {
		// Ensure createdAt and updatedAt are set if not already present (though service layer should handle this)
		const now = Date.now();
		const itemToCreate: NodeOperator = {
			...operatorData,
			createdAt: operatorData.createdAt || now,
			updatedAt: operatorData.updatedAt || now,
		};

		try {
			const command = new PutCommand({
				TableName: this.tableName,
				Item: itemToCreate, // Use the passed object, which includes SocialsDiscordId/SocialsXId
				ConditionExpression: "attribute_not_exists(address)",
			});
			await this.client.send(command);
			logger.info(
				{ address: itemToCreate.address, tableName: this.tableName },
				"Created new NodeOperator in repository"
			);
			return itemToCreate;
		} catch (error: any) {
			logger.error(
				{ 
					errorName: error?.name,
					errorMessage: error?.message,
					errorStack: error?.stack,
					errorCode: error?.code,
					fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
					address: itemToCreate.address, 
					tableName: this.tableName 
				},
				"Error creating NodeOperator in repository"
			);
			// Re-throw specific error types if needed for service layer handling
			if (error.name === "ConditionalCheckFailedException") {
				throw new Error(
					`Node operator with address ${itemToCreate.address} already exists.`
				);
			}
			throw new Error("Repository failed to create node operator.");
		}
	}

	async updateSocials(
		address: string,
		socials: NodeOperator['socials']
	): Promise<boolean> {
		try {
			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { address },
				UpdateExpression:
					"SET socials = :socials, updatedAt = :updatedAt",
				ConditionExpression: "attribute_exists(address)",
				ExpressionAttributeValues: {
					":socials": socials,
					":updatedAt": Date.now(),
				},
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ address, tableName: this.tableName },
				"Updated NodeOperator socials in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					address,
					tableName: this.tableName,
				},
				"Error updating NodeOperator socials in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ address },
					"NodeOperator not found for update socials operation"
				);
				return false;
			}
			throw error;
		}
	}

	async deleteByAddress(address: string): Promise<boolean> {
		try {
			const command = new DeleteCommand({
				TableName: this.tableName,
				Key: { address },
				ConditionExpression: "attribute_exists(address)",
			});
			await this.client.send(command);
			logger.info(
				{ address, tableName: this.tableName },
				"Deleted NodeOperator in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{ error, address, tableName: this.tableName },
				"Error deleting NodeOperator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ address },
					"NodeOperator not found for delete operation"
				);
				return false;
			}
			throw error;
		}
	}

	async deleteByDiscordId(discordId: string): Promise<boolean> {
		const operator = await this.findByDiscordId(discordId);
		if (!operator) {
			logger.warn(
				{ discordId },
				"NodeOperator not found by discordId for delete operation"
			);
			return false;
		}
		return this.deleteByAddress(operator.address);
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
			const allOperatorAddresses = new Set<string>();
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Select: "SPECIFIC_ATTRIBUTES",
					ProjectionExpression: "address"
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					for (const item of response.Items) {
						if (item.address) {
							allOperatorAddresses.add(item.address);
						}
					}
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			logger.debug(
				{ totalOperators: allOperatorAddresses.size },
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
			for (const operatorAddress of allOperatorAddresses) {
				if (!operatorsWithValidators.has(operatorAddress)) {
					operatorsWithoutValidators++;
				}
			}
			
			logger.info(
				{ 
					totalOperators: allOperatorAddresses.size,
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

	async findBySocial(
		socialPlatform: 'discord' | 'x',
		socialHandle: string
	): Promise<NodeOperator | undefined> {
		let indexName: string;
		let keyConditionExpression: string;
		let expressionAttributeValues: { [key: string]: any } = {
			":handle": socialHandle,
		};

		if (socialPlatform === 'discord') {
			indexName = DISCORD_ID_INDEX_NAME;
			keyConditionExpression = "discordId = :handle";
		} else if (socialPlatform === 'x') {
			indexName = X_ID_INDEX_NAME;
			keyConditionExpression = "xId = :handle";
		} else {
			logger.error({ socialPlatform }, "Invalid social platform for findBySocial");
			throw new Error("Invalid social platform specified.");
		}

		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: indexName,
				KeyConditionExpression: keyConditionExpression,
				ExpressionAttributeValues: expressionAttributeValues,
				Limit: 1, // Expecting only one operator for a given verified social handle
			});

			const response = await this.client.send(command);

			if (response.Items && response.Items.length > 0) {
				return response.Items[0] as NodeOperator;
			}
			return undefined;
		} catch (error) {
			logger.error(
				{ error, socialPlatform, socialHandle, indexName },
				"Error retrieving NodeOperator by social handle in repository"
			);
			throw new Error(
				"Repository failed to retrieve node operator by social handle."
			);
		}
	}

	async update(address: string, updates: Partial<NodeOperator>): Promise<boolean> {
		const updateExpressionParts: string[] = [];
		const expressionAttributeValues: { [key: string]: any } = {};
		const expressionAttributeNames: { [key: string]: string } = {};

		// Ensure updatedAt is always updated
		const effectiveUpdates = {
			...updates,
			updatedAt: Date.now(), 
		};

		for (const key in effectiveUpdates) {
			if (key === "address") continue; // Skip primary key

			const attributeKey = `:${key}`;
			// Handle nested keys like socials.discord.status if necessary, though current updates are top-level or full maps
			if (key === "socials") { // If updating the whole socials map
				updateExpressionParts.push(`socials = :socials`);
				expressionAttributeValues[":socials"] = effectiveUpdates.socials;
			} else {
                // Use ExpressionAttributeNames for keys that might be reserved words or contain invalid characters
                // Though for NodeOperator fields, this is less likely an issue than for map keys within socials
                const nameKey = `#${key}`;
                updateExpressionParts.push(`${nameKey} = ${attributeKey}`);
                expressionAttributeNames[nameKey] = key;
				expressionAttributeValues[attributeKey] = (effectiveUpdates as any)[key];
            }
		}

		if (updateExpressionParts.length === 0) {
			logger.warn({ address, updates }, "No update parts generated for NodeOperator update.");
			return true; // Or false, depending on desired behavior for empty updates
		}

		const updateExpression = "SET " + updateExpressionParts.join(", ");

		try {
			const commandParams: any = {
				TableName: this.tableName,
				Key: { address },
				UpdateExpression: updateExpression,
				ExpressionAttributeValues: expressionAttributeValues,
				ConditionExpression: "attribute_exists(address)",
				ReturnValues: "NONE",
			};

            if (Object.keys(expressionAttributeNames).length > 0) {
                commandParams.ExpressionAttributeNames = expressionAttributeNames;
            }

			const command = new UpdateCommand(commandParams);
			await this.client.send(command);
			logger.info(
				{ address, updates: effectiveUpdates, tableName: this.tableName },
				"Updated NodeOperator in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					address,
					updates: effectiveUpdates,
					tableName: this.tableName,
				},
				"Error updating NodeOperator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ address },
					"NodeOperator not found for update operation"
				);
				return false;
			}
			throw error;
		}
	}
}

export const nodeOperatorRepository = new NodeOperatorRepository();
export default nodeOperatorRepository;
