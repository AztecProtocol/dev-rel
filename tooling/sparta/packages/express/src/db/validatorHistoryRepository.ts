import {
	GetCommand,
	PutCommand,
	QueryCommand,
	DynamoDBDocumentClient,
	BatchWriteCommand,
	DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@sparta/utils";
import DynamoDBService from "@sparta/utils/dynamo-db.js";

const VALIDATOR_HISTORY_TABLE_NAME = process.env.VALIDATOR_HISTORY_TABLE_NAME || "sparta-validator-history-dev";

// Instantiate the shared service for the validator history table
const dynamoDBService = new DynamoDBService(VALIDATOR_HISTORY_TABLE_NAME);

export interface ValidatorHistoryEntry {
	validatorAddress: string; // Hash key
	slot: number; // Range key - now numeric for proper sorting
	status: string;
	timestamp?: number; // Optional timestamp for when the entry was created
}

export class ValidatorHistoryRepository {
	private client: DynamoDBDocumentClient;
	private tableName: string;

	constructor() {
		this.tableName = VALIDATOR_HISTORY_TABLE_NAME;
		// Get the client instance from the shared service
		this.client = dynamoDBService.getClient();
		logger.info(
			`ValidatorHistoryRepository initialized using shared DynamoDBService for table: ${this.tableName}`
		);
	}

	/**
	 * Get history for a specific validator, sorted by slot in descending order
	 * @param validatorAddress The validator address
	 * @param limit Optional limit on number of entries to return (defaults to 100)
	 * @param lastEvaluatedKey Optional pagination token
	 * @returns History entries and optional next page token
	 */
	async getValidatorHistory(
		validatorAddress: string,
		limit: number = 100,
		lastEvaluatedKey?: any
	): Promise<{ 
		history: Array<{ slot: string; status: string }>; 
		lastEvaluatedKey?: any;
	}> {
		try {
			const queryParams: any = {
				TableName: this.tableName,
				KeyConditionExpression: "validatorAddress = :validatorAddress",
				ExpressionAttributeValues: {
					":validatorAddress": validatorAddress,
				},
				ScanIndexForward: false, // Sort in descending order (newest first)
				Limit: limit,
			};

			if (lastEvaluatedKey) {
				queryParams.ExclusiveStartKey = lastEvaluatedKey;
			}

			const command = new QueryCommand(queryParams);
			const response = await this.client.send(command);

			const history = (response.Items || []).map(item => ({
				slot: item.slot.toString(), // Convert number back to string for API compatibility
				status: item.status,
			}));

			return {
				history,
				lastEvaluatedKey: response.LastEvaluatedKey,
			};
		} catch (error) {
			logger.error(
				{ error, validatorAddress, tableName: this.tableName },
				"Error retrieving validator history from repository"
			);
			throw new Error("Repository failed to retrieve validator history.");
		}
	}

	/**
	 * Add multiple history entries for a validator
	 * @param validatorAddress The validator address
	 * @param historyEntries Array of history entries
	 * @returns True if successful
	 */
	async addValidatorHistory(
		validatorAddress: string,
		historyEntries: Array<{ slot: string; status: string }>
	): Promise<boolean> {
		if (!historyEntries.length) {
			logger.warn({ validatorAddress }, "No history entries provided");
			return false;
		}

		try {
			const timestamp = Date.now();
			
			// Prepare items for batch write
			const putRequests = historyEntries.map(entry => ({
				PutRequest: {
					Item: {
						validatorAddress,
						slot: parseInt(entry.slot, 10), // Convert string to number
						status: entry.status,
						timestamp,
					} as ValidatorHistoryEntry,
				},
			}));

			// For large batches, use smaller batch size to avoid throttling
			const isLargeBatch = putRequests.length > 50; // Reduced threshold from 100 to 50
			const batchSize = isLargeBatch ? 5 : 15; // Further reduced batch sizes (was 10:25)
			let successCount = 0;
			let retryCount = 0;
			const maxRetries = 5; // Increased from 3 to allow more retries

			logger.info(
				{ 
					validatorAddress, 
					totalEntries: putRequests.length,
					batchSize,
					estimatedBatches: Math.ceil(putRequests.length / batchSize)
				},
				"Starting to add validator history entries"
			);

			for (let i = 0; i < putRequests.length; i += batchSize) {
				const batch = putRequests.slice(i, i + batchSize);
				const batchNumber = Math.floor(i / batchSize) + 1;
				const totalBatches = Math.ceil(putRequests.length / batchSize);
				
				let batchSuccess = false;
				let attempts = 0;
				
				while (!batchSuccess && attempts < maxRetries) {
					try {
						const command = new BatchWriteCommand({
							RequestItems: {
								[this.tableName]: batch,
							},
						});

						const response = await this.client.send(command);
						
						// Check for unprocessed items
						const unprocessedItems = response.UnprocessedItems?.[this.tableName];
						if (unprocessedItems && unprocessedItems.length > 0) {
							const unprocessedCount = unprocessedItems.length;
							logger.warn(
								{ 
									validatorAddress, 
									batchNumber,
									unprocessedCount,
									attempt: attempts + 1
								},
								"Some items were not processed, will retry"
							);
							// Put unprocessed items back for retry
							const itemsToRetry = unprocessedItems
								.filter(item => item.PutRequest?.Item)
								.map(item => ({
									PutRequest: { 
										Item: item.PutRequest!.Item as ValidatorHistoryEntry 
									}
								}));
							
							if (itemsToRetry.length > 0) {
								putRequests.splice(i + batchSize, 0, ...itemsToRetry);
							}
						}
						
						successCount += batch.length;
						batchSuccess = true;
						
						// Log progress for large batches
						if (isLargeBatch && batchNumber % 5 === 0) { // Log every 5 batches instead of 10
							logger.info(
								{ 
									validatorAddress,
									progress: `${batchNumber}/${totalBatches}`,
									processedEntries: successCount,
									percentComplete: Math.round((successCount / putRequests.length) * 100)
								},
								"History batch write progress"
							);
						}
					} catch (error: any) {
						attempts++;
						
						if (error.name === 'ThrottlingException' || error.__type?.includes('ThrottlingException') || error.message?.includes('Throughput exceeds')) {
							const backoffMs = Math.min(2000 * Math.pow(2, attempts), 30000); // Increased initial backoff from 1000ms to 2000ms, max 30s
							logger.warn(
								{ 
									validatorAddress, 
									batchNumber,
									attempt: attempts,
									backoffMs,
									error: error.message 
								},
								"DynamoDB throttling detected, backing off"
							);
							await new Promise(resolve => setTimeout(resolve, backoffMs));
							retryCount++;
						} else {
							// Non-throttling error, throw immediately
							throw error;
						}
						
						if (attempts >= maxRetries) {
							logger.error(
								{ 
									validatorAddress, 
									batchNumber,
									failedAfterAttempts: attempts 
								},
								"Failed to write batch after max retries"
							);
							throw error;
						}
					}
				}
				
				// Add delay between batches to avoid throttling - increased delays
				if (i + batchSize < putRequests.length) {
					const delayMs = isLargeBatch ? 500 : 150; // Increased delays (was 200:50)
					await new Promise(resolve => setTimeout(resolve, delayMs));
				}
			}

			logger.info(
				{ 
					validatorAddress, 
					entriesAdded: successCount,
					totalRetries: retryCount,
					isLargeBatch
				},
				"Completed adding validator history entries"
			);

			return true;
		} catch (error) {
			logger.error(
				{ error, validatorAddress, entriesCount: historyEntries.length },
				"Error adding validator history entries"
			);
			throw new Error("Repository failed to add validator history.");
		}
	}

	/**
	 * Add a single history entry for a validator
	 * @param validatorAddress The validator address
	 * @param slot The slot number
	 * @param status The status
	 * @returns True if successful
	 */
	async addSingleHistoryEntry(
		validatorAddress: string,
		slot: string,
		status: string
	): Promise<boolean> {
		try {
			const entry: ValidatorHistoryEntry = {
				validatorAddress,
				slot: parseInt(slot, 10), // Convert string to number
				status,
				timestamp: Date.now(),
			};

			const command = new PutCommand({
				TableName: this.tableName,
				Item: entry,
				// Use condition to avoid overwriting existing entries
				ConditionExpression: "attribute_not_exists(validatorAddress) AND attribute_not_exists(slot)",
			});

			await this.client.send(command);
			logger.debug(
				{ validatorAddress, slot, status },
				"Added single validator history entry"
			);

			return true;
		} catch (error: any) {
			if (error.name === "ConditionalCheckFailedException") {
				logger.debug(
					{ validatorAddress, slot },
					"History entry already exists for this slot"
				);
				return false; // Entry already exists, not an error
			}

			logger.error(
				{ error, validatorAddress, slot, status },
				"Error adding single validator history entry"
			);
			throw new Error("Repository failed to add validator history entry.");
		}
	}

	/**
	 * Get the latest history entry for a validator
	 * @param validatorAddress The validator address
	 * @returns The latest history entry or undefined if none exist
	 */
	async getLatestHistoryEntry(
		validatorAddress: string
	): Promise<{ slot: string; status: string } | undefined> {
		try {
			const result = await this.getValidatorHistory(validatorAddress, 1);
			return result.history[0];
		} catch (error) {
			logger.error(
				{ error, validatorAddress },
				"Error retrieving latest history entry"
			);
			throw new Error("Repository failed to retrieve latest history entry.");
		}
	}

	/**
	 * Get the latest slot for multiple validators efficiently
	 * This is used to determine which history entries need to be synced for each validator
	 * @param validatorAddresses Array of validator addresses
	 * @returns Map of validator address to their latest slot (as BigInt), or null if no history exists
	 */
	async getBatchLatestSlots(
		validatorAddresses: string[]
	): Promise<Record<string, bigint | null>> {
		const result: Record<string, bigint | null> = {};

		// Initialize all validators with null (no history)
		for (const address of validatorAddresses) {
			result[address.toLowerCase()] = null;
		}

		// Process in parallel but limit concurrency to avoid overwhelming DynamoDB
		const concurrencyLimit = 10; // Reduced from 20 to avoid throttling
		
		for (let i = 0; i < validatorAddresses.length; i += concurrencyLimit) {
			const batch = validatorAddresses.slice(i, i + concurrencyLimit);
			
			const promises = batch.map(async (validatorAddress) => {
				try {
					// Query for just 1 entry, sorted by slot descending
					const queryParams = {
						TableName: this.tableName,
						KeyConditionExpression: "validatorAddress = :validatorAddress",
						ExpressionAttributeValues: {
							":validatorAddress": validatorAddress,
						},
						ScanIndexForward: false, // Sort in descending order
						Limit: 1,
						ProjectionExpression: "slot", // Only get the slot field
					};

					const command = new QueryCommand(queryParams);
					const response = await this.client.send(command);

					if (response.Items && response.Items.length > 0) {
						const firstItem = response.Items[0];
						if (firstItem?.slot) {
							result[validatorAddress.toLowerCase()] = BigInt(firstItem.slot);
						}
					}
				} catch (error) {
					logger.error(
						{ error, validatorAddress },
						"Failed to get latest slot for validator in batch"
					);
					// Keep as null on error
				}
			});

			await Promise.all(promises);
			
			// Add small delay between batches to avoid throttling
			if (i + concurrencyLimit < validatorAddresses.length) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
		}

		return result;
	}

	/**
	 * Get history for multiple validators efficiently
	 * @param validatorAddresses Array of validator addresses
	 * @param limit Limit per validator (defaults to 50)
	 * @returns Map of validator address to history entries
	 */
	async getBatchValidatorHistory(
		validatorAddresses: string[],
		limit: number = 50
	): Promise<Record<string, Array<{ slot: string; status: string }>>> {
		const result: Record<string, Array<{ slot: string; status: string }>> = {};

		// Process in parallel but limit concurrency to avoid overwhelming DynamoDB
		const concurrencyLimit = 10;
		
		for (let i = 0; i < validatorAddresses.length; i += concurrencyLimit) {
			const batch = validatorAddresses.slice(i, i + concurrencyLimit);
			
			const promises = batch.map(async (validatorAddress) => {
				try {
					const historyResult = await this.getValidatorHistory(validatorAddress, limit);
					// Store result using lowercase key to match how it's looked up in validator repository
					const storageKey = validatorAddress.toLowerCase();
					result[storageKey] = historyResult.history;
				} catch (error) {
					logger.error(
						{ error, validatorAddress },
						"Failed to get history for validator in batch"
					);
					result[validatorAddress.toLowerCase()] = []; // Return empty array on error
				}
			});

			await Promise.all(promises);
		}

		return result;
	}

	/**
	 * Delete history entries for a validator starting from a specific slot
	 * This is used for reorg handling - we delete from the reorg point and re-add
	 * @param validatorAddress The validator address
	 * @param fromSlot The slot to start deleting from (inclusive)
	 * @returns Number of entries deleted
	 */
	async deleteHistoryFromSlot(
		validatorAddress: string,
		fromSlot: number
	): Promise<number> {
		try {
			// First, get all entries from the specified slot onwards
			const queryParams = {
				TableName: this.tableName,
				KeyConditionExpression: "validatorAddress = :validatorAddress AND slot >= :fromSlot",
				ExpressionAttributeValues: {
					":validatorAddress": validatorAddress,
					":fromSlot": fromSlot,
				},
				ProjectionExpression: "validatorAddress, slot", // Only need keys for deletion
			};

			const command = new QueryCommand(queryParams);
			const response = await this.client.send(command);
			
			if (!response.Items || response.Items.length === 0) {
				logger.debug(
					{ validatorAddress, fromSlot },
					"No history entries found to delete from slot"
				);
				return 0;
			}

			// Prepare delete requests
			const deleteRequests = response.Items.map(item => ({
				DeleteRequest: {
					Key: {
						validatorAddress: item.validatorAddress,
						slot: item.slot,
					}
				}
			}));

			// Process deletions in batches
			const batchSize = 25;
			let deletedCount = 0;

			for (let i = 0; i < deleteRequests.length; i += batchSize) {
				const batch = deleteRequests.slice(i, i + batchSize);
				
				const deleteCommand = new BatchWriteCommand({
					RequestItems: {
						[this.tableName]: batch,
					},
				});

				await this.client.send(deleteCommand);
				deletedCount += batch.length;
			}

			logger.info(
				{ validatorAddress, fromSlot, deletedCount },
				"Deleted history entries from slot"
			);

			return deletedCount;
		} catch (error) {
			logger.error(
				{ error, validatorAddress, fromSlot },
				"Error deleting history entries from slot"
			);
			throw new Error("Repository failed to delete history entries.");
		}
	}

	/**
	 * Overwrite history entries for a validator from a specific slot
	 * This deletes existing entries from the slot onwards and adds new ones
	 * @param validatorAddress The validator address
	 * @param fromSlot The slot to start overwriting from
	 * @param newHistoryEntries New history entries to add
	 * @returns True if successful
	 */
	async overwriteHistoryFromSlot(
		validatorAddress: string,
		fromSlot: number,
		newHistoryEntries: Array<{ slot: string; status: string }>
	): Promise<boolean> {
		try {
			// Filter new entries to only include those >= fromSlot
			const filteredEntries = newHistoryEntries.filter(entry => 
				parseInt(entry.slot, 10) >= fromSlot
			);

			if (filteredEntries.length === 0) {
				logger.debug(
					{ validatorAddress, fromSlot },
					"No new history entries to overwrite from slot"
				);
				return true;
			}

			// Delete existing entries from the slot onwards
			await this.deleteHistoryFromSlot(validatorAddress, fromSlot);

			// Add new entries
			await this.addValidatorHistory(validatorAddress, filteredEntries);

			logger.info(
				{ validatorAddress, fromSlot, newEntriesCount: filteredEntries.length },
				"Successfully overwrote history entries from slot"
			);

			return true;
		} catch (error) {
			logger.error(
				{ error, validatorAddress, fromSlot },
				"Error overwriting history entries from slot"
			);
			throw new Error("Repository failed to overwrite history entries.");
		}
	}

	/**
	 * Get the last N history entries for multiple validators efficiently
	 * This is used for reorg detection - comparing recent history across validators
	 * @param validatorAddresses Array of validator addresses
	 * @param limit Number of recent entries to get per validator (defaults to 5)
	 * @returns Map of validator address to their recent history entries (sorted by slot descending)
	 */
	async getBatchRecentHistory(
		validatorAddresses: string[],
		limit: number = 5
	): Promise<Record<string, Array<{ slot: string; status: string }>>> {
		const result: Record<string, Array<{ slot: string; status: string }>> = {};

		// Process in parallel but limit concurrency to avoid overwhelming DynamoDB
		const concurrencyLimit = 10;
		
		for (let i = 0; i < validatorAddresses.length; i += concurrencyLimit) {
			const batch = validatorAddresses.slice(i, i + concurrencyLimit);
			
			const promises = batch.map(async (validatorAddress) => {
				try {
					const historyResult = await this.getValidatorHistory(validatorAddress, limit);
					result[validatorAddress.toLowerCase()] = historyResult.history;
				} catch (error) {
					logger.error(
						{ error, validatorAddress },
						"Failed to get recent history for validator in batch"
					);
					result[validatorAddress.toLowerCase()] = []; // Return empty array on error
				}
			});

			await Promise.all(promises);
			
			// Add small delay between batches to avoid throttling
			if (i + concurrencyLimit < validatorAddresses.length) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
		}

		return result;
	}
}

export const validatorHistoryRepository = new ValidatorHistoryRepository();
export default validatorHistoryRepository; 