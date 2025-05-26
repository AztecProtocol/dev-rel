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

	async findAll(pageToken?: string): Promise<{ validators: Validator[]; nextPageToken?: string }> {
		try {
			const ITEMS_PER_PAGE = 100;
			
			// Build the scan command
			const scanParams: any = {
				TableName: this.tableName,
				Limit: ITEMS_PER_PAGE,
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
				validators: (response.Items ?? []) as Validator[],
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
		validatorAddress: string
	): Promise<Validator | undefined> {
		try {
			// First try exact match
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { validatorAddress },
			});
			const response = await this.client.send(command);
			
			// If found, return it
			if (response.Item) {
				return response.Item as Validator;
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
		nodeOperatorId: string
	): Promise<Validator[]> {
		try {
			const command = new QueryCommand({
				TableName: this.tableName,
				IndexName: NODE_OPERATOR_INDEX_NAME,
				KeyConditionExpression: "nodeOperatorId = :nodeOperatorId",
				ExpressionAttributeValues: {
					":nodeOperatorId": nodeOperatorId,
				},
			});
			const response = await this.client.send(command);
			return (response.Items || []) as Validator[];
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
}

export const validatorRepository = new ValidatorRepository();
export default validatorRepository; 