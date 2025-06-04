import {
	GetCommand,
	PutCommand,
	QueryCommand,
	ScanCommand,
	DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { logger } from "@sparta/utils";
import DynamoDBService from "@sparta/utils/dynamo-db.js";

const NETWORK_STATS_TABLE_NAME = process.env.NETWORK_STATS_TABLE_NAME || "sparta-network-stats-dev";

// Instantiate the shared service for the network stats table
const dynamoDBService = new DynamoDBService(NETWORK_STATS_TABLE_NAME);

/**
 * Interface for network statistics record
 */
export interface NetworkStats {
	epochNumber: number;
	timestamp: number;
	
	// Basic counts
	totalValidatorsInSet: number;
	activeValidators: number;
	totalPeersInNetwork: number;
	
	// Performance metrics
	networkAttestationMissRate: number;
	networkProposalMissRate: number;
	
	// Geographic distribution
	countryDistribution: Record<string, number>;
	topCountry?: { country: string; count: number };
	top3Countries: Array<{ country: string; count: number }>;
	
	// Client distribution
	clientDistribution: Record<string, number>;
	
	// ISP distribution
	ispDistribution: Record<string, number>;
	topISP?: { isp: string; count: number };
	
	// Activity metrics
	validatorsAttested24h: number;
	validatorsProposed24h: number;
	
	// Network health
	validatorsWithPeers: number;
	
	// Slot information
	currentSlot: number;
	
	// History sync tracking
	historySyncedUntil?: number | string; // Track the last slot we've synced history for
	
	// Metadata
	createdAt: number;
	ttl?: number; // Optional TTL for data expiration
}

export class NetworkStatsRepository {
	private client: DynamoDBDocumentClient;
	private tableName: string;

	constructor() {
		this.tableName = NETWORK_STATS_TABLE_NAME;
		// Get the client instance from the shared service
		this.client = dynamoDBService.getClient();
		logger.info(
			`NetworkStatsRepository initialized using shared DynamoDBService for table: ${this.tableName}`
		);
	}

	/**
	 * Get network stats for a specific epoch
	 */
	async findByEpoch(epochNumber: number): Promise<NetworkStats | undefined> {
		try {
			const command = new GetCommand({
				TableName: this.tableName,
				Key: { epochNumber },
			});
			const response = await this.client.send(command);
			return response.Item as NetworkStats;
		} catch (error) {
			logger.error(
				{ error, epochNumber, tableName: this.tableName },
				"Error retrieving network stats by epoch"
			);
			throw new Error("Repository failed to retrieve network stats by epoch.");
		}
	}

	/**
	 * Get the latest network stats
	 */
	async findLatest(): Promise<NetworkStats | undefined> {
		try {
			// Use scan with limit 1 and sort by epochNumber descending
			// Note: For better performance with large datasets, consider using GSI on timestamp
			const command = new ScanCommand({
				TableName: this.tableName,
				Limit: 1,
			});
			
			const response = await this.client.send(command);
			
			// If we have items, find the one with the highest epoch number
			if (response.Items && response.Items.length > 0) {
				// Get all items (might need pagination for large datasets)
				let allItems = response.Items as NetworkStats[];
				let lastEvaluatedKey = response.LastEvaluatedKey;
				
				// Continue scanning if there are more items
				while (lastEvaluatedKey) {
					const nextCommand = new ScanCommand({
						TableName: this.tableName,
						ExclusiveStartKey: lastEvaluatedKey,
					});
					const nextResponse = await this.client.send(nextCommand);
					if (nextResponse.Items) {
						allItems = allItems.concat(nextResponse.Items as NetworkStats[]);
					}
					lastEvaluatedKey = nextResponse.LastEvaluatedKey;
				}
				
				// Sort by epochNumber descending and return the latest
				allItems.sort((a, b) => b.epochNumber - a.epochNumber);
				return allItems[0];
			}
			
			return undefined;   1
		} catch (error) {
			logger.error(
				{ error, tableName: this.tableName },
				"Error retrieving latest network stats"
			);
			throw new Error("Repository failed to retrieve latest network stats.");
		}
	}

	/**
	 * Get network stats for a range of epochs
	 */
	async findByEpochRange(
		startEpoch: number,
		endEpoch: number
	): Promise<NetworkStats[]> {
		try {
			const items: NetworkStats[] = [];
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					FilterExpression: "epochNumber BETWEEN :start AND :end",
					ExpressionAttributeValues: {
						":start": startEpoch,
						":end": endEpoch,
					},
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					items.push(...(response.Items as NetworkStats[]));
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			// Sort by epochNumber ascending
			items.sort((a, b) => a.epochNumber - b.epochNumber);
			
			return items;
		} catch (error) {
			logger.error(
				{ error, startEpoch, endEpoch, tableName: this.tableName },
				"Error retrieving network stats by epoch range"
			);
			throw new Error("Repository failed to retrieve network stats by epoch range.");
		}
	}

	/**
	 * Create or update network stats for an epoch
	 */
	async upsert(stats: NetworkStats): Promise<NetworkStats> {
		try {
			const now = Date.now();
			const item = {
				...stats,
				createdAt: stats.createdAt || now,
				timestamp: stats.timestamp || now,
			};
			
			// Optionally set TTL (e.g., expire after 90 days)
			const ninetyDaysInSeconds = 90 * 24 * 60 * 60;
			item.ttl = Math.floor(now / 1000) + ninetyDaysInSeconds;
			
			const command = new PutCommand({
				TableName: this.tableName,
				Item: item,
			});
			
			await this.client.send(command);
			
			logger.info(
				{ epochNumber: stats.epochNumber, tableName: this.tableName },
				"Upserted network stats for epoch"
			);
			
			return item;
		} catch (error) {
			logger.error(
				{ error, epochNumber: stats.epochNumber, tableName: this.tableName },
				"Error upserting network stats"
			);
			throw new Error("Repository failed to upsert network stats.");
		}
	}

	/**
	 * Get stats from the last N hours
	 */
	async findRecentStats(hoursAgo: number): Promise<NetworkStats[]> {
		try {
			const cutoffTimestamp = Date.now() - (hoursAgo * 60 * 60 * 1000);
			const items: NetworkStats[] = [];
			let lastEvaluatedKey: any = undefined;
			
			do {
				const scanParams: any = {
					TableName: this.tableName,
					FilterExpression: "#ts >= :cutoff",
					ExpressionAttributeNames: {
						"#ts": "timestamp",
					},
					ExpressionAttributeValues: {
						":cutoff": cutoffTimestamp,
					},
				};
				
				if (lastEvaluatedKey) {
					scanParams.ExclusiveStartKey = lastEvaluatedKey;
				}
				
				const command = new ScanCommand(scanParams);
				const response = await this.client.send(command);
				
				if (response.Items) {
					items.push(...(response.Items as NetworkStats[]));
				}
				
				lastEvaluatedKey = response.LastEvaluatedKey;
			} while (lastEvaluatedKey);
			
			// Sort by timestamp descending
			items.sort((a, b) => b.timestamp - a.timestamp);
			
			return items;
		} catch (error) {
			logger.error(
				{ error, hoursAgo, tableName: this.tableName },
				"Error retrieving recent network stats"
			);
			throw new Error("Repository failed to retrieve recent network stats.");
		}
	}
}

// Export a singleton instance
export const networkStatsRepository = new NetworkStatsRepository(); 