/**
 * @fileoverview Provides a configured DynamoDB DocumentClient for a specified table.
 * @description Service class to interact with AWS DynamoDB.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	// Import specific commands only if this class provides direct helper methods for them.
	// GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "./logger.js";

class DynamoDBService {
	private client: DynamoDBDocumentClient;
	private tableName: string;
	private isLocal: boolean;

	constructor(tableName: string) {
		this.tableName = tableName;
		this.isLocal = process.env.LOCAL_DYNAMO_DB === "true";

		// Create the DynamoDB client
		const clientOptions: ConstructorParameters<typeof DynamoDBClient>[0] = {};

		// Use local DynamoDB when running locally
		if (this.isLocal) {
			clientOptions.endpoint =
				process.env.DYNAMODB_ENDPOINT || "http://localhost:8000";
			logger.info(`Using local DynamoDB at ${clientOptions.endpoint} for table ${this.tableName}`);
		} else {
			// Add region if not local and if it's configured, e.g., process.env.AWS_REGION
			if (process.env.AWS_REGION) {
				clientOptions.region = process.env.AWS_REGION;
			}
			logger.info(`Using AWS DynamoDB ${clientOptions.region ? 'in region ' + clientOptions.region : ''} for table ${this.tableName}`);
		}

		const dynamoClient = new DynamoDBClient(clientOptions);
		this.client = DynamoDBDocumentClient.from(dynamoClient);
		logger.debug(`DynamoDBService initialized for table: ${this.tableName}`);
	}

	/**
	 * Exposes the underlying DynamoDBDocumentClient for direct use.
	 * @returns The configured DynamoDBDocumentClient instance.
	 */
	public getClient(): DynamoDBDocumentClient {
		return this.client;
	}

	/**
	 * Gets the table name this service instance is configured for.
	 * @returns The DynamoDB table name.
	 */
	public getTableName(): string {
		return this.tableName;
	}
}

export default DynamoDBService;
