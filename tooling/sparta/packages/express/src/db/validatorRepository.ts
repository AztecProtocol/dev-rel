import {
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	ScanCommand,
	DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@sparta/utils";
import type { Validator } from "../domain/validators/service";
import DynamoDBService from "@sparta/utils/dynamo-db.js";
import { validatorHistoryRepository } from "./validatorHistoryRepository";

const VALIDATORS_TABLE_NAME = process.env.VALIDATORS_TABLE_NAME || "sparta-validators-dev";
const NODE_OPERATOR_INDEX_NAME = "NodeOperatorIndex";

// Instantiate the shared service for the validators table
const dynamoDBService = new DynamoDBService(VALIDATORS_TABLE_NAME);

export class ValidatorRepository {
	private client: DynamoDBDocumentClient;
	private tableName: string;

	constructor() {
		this.tableName = VALIDATORS_TABLE_NAME;
		// Get the client instance from the shared service
		this.client = dynamoDBService.getClient();
		logger.info(
			`ValidatorRepository initialized using shared DynamoDBService for table: ${this.tableName}`
		);
	}

	async findAll(pageToken?: string, includeHistory: boolean = true, historyLimit: number = 100): Promise<{ validators: Validator[]; nextPageToken?: string }> {
		try {
			// If no pageToken provided, fetch ALL validators
			if (!pageToken) {
				let allValidators: Validator[] = [];
				let lastEvaluatedKey: any = undefined;
				
				do {
					const scanParams: any = {
						TableName: this.tableName,
						Limit: 1000, // Process in batches to avoid timeout
					};
					
					if (lastEvaluatedKey) {
						scanParams.ExclusiveStartKey = lastEvaluatedKey;
					}
					
					// Exclude history from the main table projection since it's in a separate table
					scanParams.ProjectionExpression = "validatorAddress, nodeOperatorId, createdAt, updatedAt, peerId, isActive, #epoch, hasAttested24h, lastAttestationSlot, lastAttestationTimestamp, lastAttestationDate, lastProposalSlot, lastProposalTimestamp, lastProposalDate, missedAttestationsCount, missedProposalsCount, totalSlots, peerClient, peerCountry, peerCity, peerIpAddress, peerPort, peerIsSynced, peerBlockHeight, peerLastSeen";
					scanParams.ExpressionAttributeNames = {
						"#epoch": "epoch" // epoch is a reserved word in DynamoDB
					};
					
					const command = new ScanCommand(scanParams);
					const response = await this.client.send(command);
					
					allValidators = allValidators.concat((response.Items ?? []) as Validator[]);
					lastEvaluatedKey = response.LastEvaluatedKey;
					
				} while (lastEvaluatedKey);
				
				logger.info(`Retrieved ${allValidators.length} total validators from database`);
				
				// Get history for all validators if requested
				if (includeHistory && allValidators.length > 0) {
					const validatorAddresses = allValidators.map(v => v.validatorAddress.toLowerCase());
					const historyMap = await validatorHistoryRepository.getBatchValidatorHistory(validatorAddresses, historyLimit);
					
					// Attach history to each validator
					allValidators.forEach(validator => {
						validator.history = historyMap[validator.validatorAddress.toLowerCase()] || [];
					});
				}
				
				return {
					validators: allValidators,
					nextPageToken: undefined,
				};
			}
			
			// Paginated request - return single page with limit
			const ITEMS_PER_PAGE = 1000;
			
			// Build the scan command
			const scanParams: any = {
				TableName: this.tableName,
				Limit: ITEMS_PER_PAGE,
			};
			
			// Exclude history from the main table projection since it's in a separate table
			scanParams.ProjectionExpression = "validatorAddress, nodeOperatorId, createdAt, updatedAt, peerId, isActive, #epoch, hasAttested24h, lastAttestationSlot, lastAttestationTimestamp, lastAttestationDate, lastProposalSlot, lastProposalTimestamp, lastProposalDate, missedAttestationsCount, missedProposalsCount, totalSlots, peerClient, peerCountry, peerCity, peerIpAddress, peerPort, peerIsSynced, peerBlockHeight, peerLastSeen";
			scanParams.ExpressionAttributeNames = {
				"#epoch": "epoch" // epoch is a reserved word in DynamoDB
			};
			
			// Use the provided page token as the ExclusiveStartKey
			try {
				const decodedToken = JSON.parse(Buffer.from(pageToken, 'base64').toString());
				scanParams.ExclusiveStartKey = decodedToken;
			} catch (error) {
				logger.error({ error, pageToken }, "Invalid page token format");
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

			let validators = (response.Items ?? []) as Validator[];
			
			// Get history for validators if requested
			if (includeHistory && validators.length > 0) {
				const validatorAddresses = validators.map(v => v.validatorAddress.toLowerCase());
				const historyMap = await validatorHistoryRepository.getBatchValidatorHistory(validatorAddresses, historyLimit);
				
				// Attach history to each validator
				validators.forEach(validator => {
					validator.history = historyMap[validator.validatorAddress.toLowerCase()] || [];
				});
			}
			
			return {
				validators,
				nextPageToken,
			};
		} catch (error) {
			logger.error(
				{ error, tableName: this.tableName },
				"Error scanning Validators table in repository"
			);
			throw new Error("Repository failed to retrieve validators.");
		}
	}

	async findByAddress(
		validatorAddress: string,
		includeHistory: boolean = true,
		historyLimit: number = 100
	): Promise<Validator | undefined> {
		try {
			// First try exact match
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { validatorAddress },
				// Exclude history from projection since it's in a separate table
				ProjectionExpression: "validatorAddress, nodeOperatorId, createdAt, updatedAt, peerId, isActive, #epoch, hasAttested24h, lastAttestationSlot, lastAttestationTimestamp, lastAttestationDate, lastProposalSlot, lastProposalTimestamp, lastProposalDate, missedAttestationsCount, missedProposalsCount, totalSlots, peerClient, peerCountry, peerCity, peerIpAddress, peerPort, peerIsSynced, peerBlockHeight, peerLastSeen",
				ExpressionAttributeNames: {
					"#epoch": "epoch" // epoch is a reserved word in DynamoDB
				}
			});
			const response = await this.client.send(command);
			
			// If found, attach history and return
			if (response.Item) {
				const validator = response.Item as Validator;
				
				// Get history from separate table if requested
				if (includeHistory) {
					const historyResult = await validatorHistoryRepository.getValidatorHistory(validatorAddress, historyLimit);
					validator.history = historyResult.history;
				}
				
				return validator;
			}
			
			// If exact match fails, try case-insensitive search
			logger.debug(
				{ validatorAddress },
				"Exact match failed, trying case-insensitive search with pagination"
			);
			
			// Use paginated scan for case-insensitive search rather than loading all at once
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Limit: 1000, // Process in smaller batches
					// Exclude history from projection
					ProjectionExpression: "validatorAddress, nodeOperatorId, createdAt, updatedAt, peerId, isActive, #epoch, hasAttested24h, lastAttestationSlot, lastAttestationTimestamp, lastAttestationDate, lastProposalSlot, lastProposalTimestamp, lastProposalDate, missedAttestationsCount, missedProposalsCount, totalSlots, peerClient, peerCountry, peerCity, peerIpAddress, peerPort, peerIsSynced, peerBlockHeight, peerLastSeen",
					ExpressionAttributeNames: {
						"#epoch": "epoch"
					}
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const scanCommand = new ScanCommand(scanParams);
				const scanResponse = await this.client.send(scanCommand);
				const validators = scanResponse.Items as Validator[] || [];
				
				// Find case-insensitive match in this batch
				const matchingValidator = validators.find(v => 
					v.validatorAddress.toLowerCase() === validatorAddress.toLowerCase()
				);
				
				if (matchingValidator) {
					logger.debug(
						{ foundAddress: matchingValidator.validatorAddress, searchedFor: validatorAddress },
						"Found case-insensitive match for validator address"
					);
					
					// Get history from separate table if requested
					if (includeHistory) {
						const historyResult = await validatorHistoryRepository.getValidatorHistory(matchingValidator.validatorAddress, historyLimit);
						matchingValidator.history = historyResult.history;
					}
					
					return matchingValidator;
				}
				
				// Get the last evaluated key for the next page
				lastEvaluatedKey = scanResponse.LastEvaluatedKey;
				
			} while (lastEvaluatedKey);
			
			// No match found
			logger.debug(
				{ validatorAddress },
				"No validator found with the given address (case-insensitive)"
			);
			return undefined;
		} catch (error) {
			logger.error(
				{ error, validatorAddress, tableName: this.tableName },
				"Error retrieving Validator by address in repository"
			);
			throw new Error(
				"Repository failed to retrieve validator by address."
			);
		}
	}

	async findByNodeOperator(
		nodeOperatorId: string,
		includeHistory: boolean = true,
		historyLimit: number = 100
	): Promise<Validator[]> {
		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: NODE_OPERATOR_INDEX_NAME,
				KeyConditionExpression: "nodeOperatorId = :nodeOperatorId",
				ExpressionAttributeValues: {
					":nodeOperatorId": nodeOperatorId,
				},
				// Exclude history from projection
				ProjectionExpression: "validatorAddress, nodeOperatorId, createdAt, updatedAt, peerId, isActive, #epoch, hasAttested24h, lastAttestationSlot, lastAttestationTimestamp, lastAttestationDate, lastProposalSlot, lastProposalTimestamp, lastProposalDate, missedAttestationsCount, missedProposalsCount, totalSlots, peerClient, peerCountry, peerCity, peerIpAddress, peerPort, peerIsSynced, peerBlockHeight, peerLastSeen",
				ExpressionAttributeNames: {
					"#epoch": "epoch"
				}
			});
			const response = await this.client.send(command);
			const validators = (response.Items || []) as Validator[];
			
			// Get history for all validators if requested
			if (includeHistory && validators.length > 0) {
				const validatorAddresses = validators.map(v => v.validatorAddress);
				const historyMap = await validatorHistoryRepository.getBatchValidatorHistory(validatorAddresses, historyLimit);
				
				// Attach history to each validator
				validators.forEach(validator => {
					validator.history = historyMap[validator.validatorAddress] || historyMap[validator.validatorAddress.toLowerCase()] || [];
				});
			}
			
			return validators;
		} catch (error) {
			logger.error(
				error, nodeOperatorId, this.tableName,
				"Error querying Validators by node operator in repository"
			);
			throw new Error(
				"Repository failed to retrieve validators by node operator."
			);
		}
	}

	async countAll(): Promise<number> {
		try {
			// Use pagination to count all items instead of relying on the COUNT option
			let totalCount = 0;
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					Limit: 1000,
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				totalCount += response.Items?.length || 0;
				lastEvaluatedKey = response.LastEvaluatedKey;
				
				logger.debug(
					{ 
						batchSize: response.Items?.length || 0,
						runningTotal: totalCount,
						hasMoreItems: !!lastEvaluatedKey
					},
					"Counting Validators with pagination"
				);
			} while (lastEvaluatedKey);
			
			return totalCount;
		} catch (error) {
			logger.error(
				{ error, tableName: this.tableName },
				"Error counting Validators in repository"
			);
			throw new Error("Repository failed to count validators.");
		}
	}

	async create(
		validatorAddress: string,
		nodeOperatorId: string
	): Promise<Validator> {
		const now = Date.now();
		const newValidator: Validator = {
			validatorAddress,
			nodeOperatorId,
			createdAt: now,
			updatedAt: now,
		};

		try {
			const command = new PutCommand({
				TableName: this.tableName,
				Item: newValidator,
				ConditionExpression: "attribute_not_exists(validatorAddress)",
			});
			await this.client.send(command);
			logger.info(
				{ validatorAddress, nodeOperatorId, tableName: this.tableName },
				"Created new Validator in repository"
			);
			return newValidator;
		} catch (error: any) {
			logger.error(
				{ error, validatorAddress, nodeOperatorId, tableName: this.tableName },
				"Error creating Validator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				throw new Error(
					`Validator with address ${validatorAddress} already exists.`
				);
			}
			throw new Error("Repository failed to create validator.");
		}
	}

	async createWithoutOperator(
		validatorAddress: string
	): Promise<Validator> {
		const now = Date.now();
		const newValidator: Validator = {
			validatorAddress,
			createdAt: now,
			updatedAt: now,
		};

		try {
			const command = new PutCommand({
				TableName: this.tableName,
				Item: newValidator,
				ConditionExpression: "attribute_not_exists(validatorAddress)",
			});
			await this.client.send(command);
			logger.info(
				{ validatorAddress, tableName: this.tableName },
				"Created new Validator without operator in repository"
			);
			return newValidator;
		} catch (error: any) {
			logger.error(
				{ error, validatorAddress, tableName: this.tableName },
				"Error creating Validator without operator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				throw new Error(
					`Validator with address ${validatorAddress} already exists.`
				);
			}
			throw new Error("Repository failed to create validator.");
		}
	}

	async updateNodeOperator(
		validatorAddress: string,
		newNodeOperatorId: string
	): Promise<boolean> {
		try {
			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { validatorAddress },
				UpdateExpression:
					"SET nodeOperatorId = :nodeOperatorId, updatedAt = :updatedAt",
				ConditionExpression: "attribute_exists(validatorAddress)",
				ExpressionAttributeValues: {
					":nodeOperatorId": newNodeOperatorId,
					":updatedAt": Date.now(),
				},
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ validatorAddress, newNodeOperatorId, tableName: this.tableName },
				"Updated Validator node operator in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					validatorAddress,
					newNodeOperatorId,
					tableName: this.tableName,
				},
				"Error updating Validator node operator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ validatorAddress },
					"Validator not found for update operation"
				);
				return false;
			}
			throw error;
		}
	}

	async updatePeerId(
		validatorAddress: string,
		peerId: string | null
	): Promise<boolean> {
		try {
			const updateExpression = peerId 
				? "SET peerId = :peerId, updatedAt = :updatedAt"
				: "REMOVE peerId SET updatedAt = :updatedAt";
			
			const expressionAttributeValues: any = {
				":updatedAt": Date.now(),
			};
			
			if (peerId) {
				expressionAttributeValues[":peerId"] = peerId;
			}

			const command = new UpdateCommand({
				TableName: this.tableName,
				Key: { validatorAddress },
				UpdateExpression: updateExpression,
				ConditionExpression: "attribute_exists(validatorAddress)",
				ExpressionAttributeValues: expressionAttributeValues,
				ReturnValues: "NONE",
			});
			await this.client.send(command);
			logger.info(
				{ validatorAddress, peerId, tableName: this.tableName },
				"Updated Validator peerId in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{
					error,
					validatorAddress,
					peerId,
					tableName: this.tableName,
				},
				"Error updating Validator peerId in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ validatorAddress },
					"Validator not found for peerId update operation"
				);
				return false;
			}
			throw error;
		}
	}

	async deleteByAddress(validatorAddress: string): Promise<boolean> {
		try {
			const command = new DeleteCommand({
				TableName: this.tableName,
				Key: { validatorAddress },
				ConditionExpression: "attribute_exists(validatorAddress)",
			});
			await this.client.send(command);
			logger.info(
				{ validatorAddress, tableName: this.tableName },
				"Deleted Validator in repository"
			);
			return true;
		} catch (error: any) {
			logger.error(
				{ error, validatorAddress, tableName: this.tableName },
				"Error deleting Validator in repository"
			);
			if (error.name === "ConditionalCheckFailedException") {
				logger.warn(
					{ validatorAddress },
					"Validator not found for delete operation"
				);
				return false;
			}
			throw error;
		}
	}

	/**
	 * Updates validator stats with processed data from RPC and peer crawler
	 * @param validatorAddress The validator address
	 * @param statsData Processed stats data to update
	 * @returns True if update was successful
	 */
	async updateValidatorStats(
		validatorAddress: string,
		statsData: Partial<Validator>
	): Promise<boolean> {
		try {
			// Build update expression dynamically based on provided fields
			const updateExpressions: string[] = [];
			const expressionAttributeNames: Record<string, string> = {};
			const expressionAttributeValues: Record<string, any> = {};

			// Always update the updatedAt timestamp
			updateExpressions.push("#updatedAt = :updatedAt");
			expressionAttributeNames["#updatedAt"] = "updatedAt";
			expressionAttributeValues[":updatedAt"] = Date.now();

			// Handle history field separately using the history repository
			let historyToAdd: Array<{ slot: string; status: string }> = [];
			if (statsData.history && statsData.history.length > 0) {
				historyToAdd = statsData.history;
				// Remove history from statsData since we're handling it separately
				delete statsData.history;
			}

			// Handle each stats field (excluding history)
			const fieldsToUpdate = [
				'epoch', 'hasAttested24h', 'lastAttestationSlot', 'lastAttestationTimestamp',
				'lastAttestationDate', 'lastProposalSlot', 'lastProposalTimestamp', 
				'lastProposalDate', 'missedAttestationsCount', 'missedProposalsCount', 
				'totalSlots', 'peerClient', 'peerCountry', 'peerCity', 'peerIpAddress',
				'peerPort', 'peerIsSynced', 'peerBlockHeight', 'peerLastSeen'
			];

			fieldsToUpdate.forEach(field => {
				if (statsData[field as keyof Validator] !== undefined) {
					updateExpressions.push(`#${field} = :${field}`);
					expressionAttributeNames[`#${field}`] = field;
					expressionAttributeValues[`:${field}`] = statsData[field as keyof Validator];
				}
			});

			// Update the main validator record (excluding history)
			if (updateExpressions.length > 1) { // More than just updatedAt
				const command = new UpdateCommand({
					TableName: this.tableName,
					Key: { validatorAddress },
					UpdateExpression: `SET ${updateExpressions.join(", ")}`,
					ExpressionAttributeNames: expressionAttributeNames,
					ExpressionAttributeValues: expressionAttributeValues,
					ConditionExpression: "attribute_exists(validatorAddress)", // Ensure validator exists
				});

				await this.client.send(command);
			}

			// Add history entries to the separate history table
			if (historyToAdd.length > 0) {
				await validatorHistoryRepository.addValidatorHistory(validatorAddress, historyToAdd);
			}

			logger.debug(
				{ validatorAddress, updatedFields: Object.keys(statsData), historyEntries: historyToAdd.length },
				"Updated validator stats in repository"
			);
			return true;
		} catch (error: any) {
			if (error.name === "ConditionalCheckFailedException") {
				logger.debug(
					{ validatorAddress },
					"Validator not found when trying to update stats"
				);
				return false;
			}
			logger.error(
				{ error, validatorAddress },
				"Error updating validator stats in repository"
			);
			throw new Error("Repository failed to update validator stats.");
		}
	}

	/**
	 * Batch update multiple validators' stats
	 * @param updates Array of validator address and stats data pairs
	 * @returns Number of successful updates
	 */
	async batchUpdateValidatorStats(
		updates: Array<{ validatorAddress: string; statsData: Partial<Validator> }>
	): Promise<number> {
		let successCount = 0;
		
		// Process updates in smaller batches to avoid overwhelming DynamoDB
		const batchSize = 5; // Further reduced from 10 to avoid throttling
		const maxRetries = 3;
		
		for (let i = 0; i < updates.length; i += batchSize) {
			const batch = updates.slice(i, i + batchSize);
			const batchNumber = Math.floor(i / batchSize) + 1;
			const totalBatches = Math.ceil(updates.length / batchSize);
			
			let retryCount = 0;
			let batchSuccess = false;
			
			while (!batchSuccess && retryCount < maxRetries) {
				try {
					const promises = batch.map(async ({ validatorAddress, statsData }) => {
						try {
							const success = await this.updateValidatorStats(validatorAddress, statsData);
							if (success) return { success: true, validatorAddress };
							return { success: false, validatorAddress };
						} catch (error: any) {
							// Check for throttling errors
							if (error.name === 'ThrottlingException' || error.message?.includes('Throughput exceeds')) {
								throw error; // Let the batch-level retry handle this
							}
							logger.error(
								{ error, validatorAddress },
								"Failed to update validator stats in batch"
							);
							return { success: false, validatorAddress };
						}
					});
					
					const results = await Promise.all(promises);
					const batchSuccessCount = results.filter(r => r.success).length;
					successCount += batchSuccessCount;
					batchSuccess = true;
					
					if (batchNumber % 50 === 0 || batchNumber === totalBatches) {
						logger.info(
							{ 
								batchNumber, 
								totalBatches, 
								batchSuccessCount,
								totalSuccessCount: successCount,
								percentComplete: Math.round((batchNumber / totalBatches) * 100)
							},
							"Validator stats batch update progress"
						);
					}
				} catch (error: any) {
					retryCount++;
					
					if (error.name === 'ThrottlingException' || error.message?.includes('Throughput exceeds')) {
						const backoffMs = Math.min(2000 * Math.pow(2, retryCount), 30000); // Exponential backoff up to 30s
						logger.warn(
							{ 
								batchNumber, 
								retryCount,
								backoffMs,
								error: error.message 
							},
							"DynamoDB throttling detected in validator stats batch, backing off"
						);
						await new Promise(resolve => setTimeout(resolve, backoffMs));
					} else {
						// Non-throttling error, break the retry loop
						logger.error(
							{ error, batchNumber },
							"Non-throttling error in validator stats batch update"
						);
						break;
					}
					
					if (retryCount >= maxRetries) {
						logger.error(
							{ batchNumber, retryCount },
							"Failed to update validator stats batch after max retries"
						);
					}
				}
			}
			
			// Add delay between batches to avoid throttling - increased delay
			if (i + batchSize < updates.length) {
				await new Promise(resolve => setTimeout(resolve, 300)); // Increased from 100ms to 300ms
			}
		}
		
		logger.info(
			{ total: updates.length, successful: successCount },
			"Completed batch validator stats update"
		);
		
		return successCount;
	}
}

export const validatorRepository = new ValidatorRepository();
export default validatorRepository; 