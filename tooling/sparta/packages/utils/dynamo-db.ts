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
			logger.info(`Using AWS DynamoDB ${clientOptions.region ? 'in region ' + clientOptions.region : ''} for table ${this.tableName}`);
		}

		clientOptions.region = process.env.AWS_REGION || "eu-west-2";
		clientOptions.credentials = {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID || "whenpigsfly",
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "whenpigsfly",
		};

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
