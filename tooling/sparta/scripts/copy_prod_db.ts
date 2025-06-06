import { spawn } from "child_process";
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const PRODUCTION_REGION = process.env.AWS_REGION || "eu-west-2";
const LOCAL_ENDPOINT = "http://localhost:8000";

// Configurable limits for copying data
const COPY_LIMITS = {
  validators: parseInt(process.env.COPY_LIMIT_VALIDATORS || "0"), // 0 means no limit
  nodeOperators: parseInt(process.env.COPY_LIMIT_NODE_OPERATORS || "0"),
  networkStats: parseInt(process.env.COPY_LIMIT_NETWORK_STATS || "0"),
  validatorHistory: parseInt(process.env.COPY_LIMIT_VALIDATOR_HISTORY || "0")
};

export async function setupLocalDB(): Promise<void> {
  try {
    console.log("🗑️  Cleaning up existing tables...");
    await cleanupLocalTables();
    
    console.log("🏗️  Creating tables...");
    await createLocalTables();
    
    console.log("✅ Database setup complete!");
  } catch (error) {
    console.error({ error }, "Failed to setup database");
    throw error;
  }
}

export async function copyDB(): Promise<void> {
  try {
    console.log("📥 Copying production data to local tables...");
    console.log("📊 Copy limits:", COPY_LIMITS);
    await copyProductionData();
    
    console.log("✅ Database copy complete!");
  } catch (error) {
    console.error({ error }, "Failed to copy database");
    throw error;
  }
}

export async function cleanupLocalDB(): Promise<void> {
  try {
    console.log("🛑 Stopping DynamoDB Docker container...");
    
    // Stop and remove the container
    await runCommand("docker", ["stop", "dynamodb-local"]);
    await runCommand("docker", ["rm", "dynamodb-local"]);
    
    console.log("✅ Database cleanup complete!");
  } catch (error) {
    console.error({ error }, "Failed to cleanup database");
  }
}

async function cleanupLocalTables(): Promise<void> {
  const localClient = new DynamoDBClient({
    region: "local",
    endpoint: LOCAL_ENDPOINT
  });

  try {
    // List existing tables
    const listCommand = new ListTablesCommand({});
    const existingTables = await localClient.send(listCommand);
    
    if (!existingTables.TableNames || existingTables.TableNames.length === 0) {
      console.log("ℹ️ No existing tables found");
      return;
    }

    console.log(`📋 Found ${existingTables.TableNames.length} existing tables`);

    // Delete tables if they exist
    const tablesToDelete = [
      process.env.NODE_OPERATORS_TABLE_NAME,
      process.env.VALIDATORS_TABLE_NAME,
      process.env.NETWORK_STATS_TABLE_NAME,
      process.env.VALIDATOR_HISTORY_TABLE_NAME
    ];
    
    for (const tableName of tablesToDelete) {
      if (existingTables.TableNames.includes(tableName || "")) {
        console.log(`🗑️  Deleting table: ${tableName}`);
        try {
          await localClient.send(new DeleteTableCommand({ TableName: tableName }));
          console.log(`✅ Deleted table: ${tableName}`);
          
          // Wait for table to be deleted
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          if (error.name === "ResourceNotFoundException") {
            console.log(`ℹ️ Table ${tableName} does not exist`);
          } else {
            console.warn(`⚠️ Failed to delete table ${tableName}:`, error.message);
          }
        }
      } else {
        console.log(`ℹ️ Table ${tableName} does not exist`);
      }
    }
  } catch (error) {
    console.error({ error }, "Failed to cleanup local tables");
    throw error;
  }
}

async function createLocalTables(): Promise<void> {
  const localClient = new DynamoDBClient({
    region: "local",
    endpoint: LOCAL_ENDPOINT
  });

  // Create node operators table (address primary key - NEW structure)
  console.log(`🏗️  Creating table: ${process.env.NODE_OPERATORS_TABLE_NAME}`);
  try {
    await localClient.send(new CreateTableCommand({
      TableName: process.env.NODE_OPERATORS_TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "address",
          AttributeType: "S",
        },
        {
          AttributeName: "discordId",
          AttributeType: "S",
        },
        {
          AttributeName: "xId",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "address",
          KeyType: "HASH", // Partition key - NEW structure with address as primary key
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "DiscordIdIndex",
          KeySchema: [
            {
              AttributeName: "discordId",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
        {
          IndexName: "XIdIndex",
          KeySchema: [
            {
              AttributeName: "xId",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }));
    console.log(`✅ Created table: ${process.env.NODE_OPERATORS_TABLE_NAME}`);
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log(`ℹ️ Table ${process.env.NODE_OPERATORS_TABLE_NAME} already exists`);
    } else {
      console.error({ error }, `Failed to create table: ${process.env.NODE_OPERATORS_TABLE_NAME}`);
      throw error;
    }
  }

  // Create validators table
  console.log(`🏗️  Creating table: ${process.env.VALIDATORS_TABLE_NAME}`);
  try {
    await localClient.send(new CreateTableCommand({
      TableName: process.env.VALIDATORS_TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "validatorAddress",
          AttributeType: "S",
        },
        {
          AttributeName: "nodeOperatorId",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "validatorAddress",
          KeyType: "HASH", // Partition key
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "NodeOperatorIndex",
          KeySchema: [
            {
              AttributeName: "nodeOperatorId",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }));
    console.log(`✅ Created table: ${process.env.VALIDATORS_TABLE_NAME}`);
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log(`ℹ️ Table ${process.env.VALIDATORS_TABLE_NAME} already exists`);
    } else {
      console.error({ error }, `Failed to create table: ${process.env.VALIDATORS_TABLE_NAME}`);
      throw error;
    }
  }

  // Create network stats table
  console.log(`🏗️  Creating table: ${process.env.NETWORK_STATS_TABLE_NAME}`);
  try {
    await localClient.send(new CreateTableCommand({
      TableName: process.env.NETWORK_STATS_TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "epochNumber",
          AttributeType: "N",
        },
        {
          AttributeName: "timestamp",
          AttributeType: "N",
        },
      ],
      KeySchema: [
        {
          AttributeName: "epochNumber",
          KeyType: "HASH", // Partition key
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "TimestampIndex",
          KeySchema: [
            {
              AttributeName: "timestamp",
              KeyType: "HASH",
            },
          ],
          Projection: {
            ProjectionType: "ALL",
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }));
    console.log(`✅ Created table: ${process.env.NETWORK_STATS_TABLE_NAME}`);
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log(`ℹ️ Table ${process.env.NETWORK_STATS_TABLE_NAME} already exists`);
    } else {
      console.error({ error }, `Failed to create table: ${process.env.NETWORK_STATS_TABLE_NAME}`);
      throw error;
    }
  }

  // Create validator history table
  console.log(`🏗️  Creating table: ${process.env.VALIDATOR_HISTORY_TABLE_NAME}`);
  try {
    await localClient.send(new CreateTableCommand({
      TableName: process.env.VALIDATOR_HISTORY_TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "validatorAddress",
          AttributeType: "S",
        },
        {
          AttributeName: "slot",
          AttributeType: "N",
        },
      ],
      KeySchema: [
        {
          AttributeName: "validatorAddress",
          KeyType: "HASH", // Partition key
        },
        {
          AttributeName: "slot",
          KeyType: "RANGE", // Sort key
        },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    }));
    console.log(`✅ Created table: ${process.env.VALIDATOR_HISTORY_TABLE_NAME}`);
  } catch (error: any) {
    if (error.name === "ResourceInUseException") {
      console.log(`ℹ️ Table ${process.env.VALIDATOR_HISTORY_TABLE_NAME} already exists`);
    } else {
      console.error({ error }, `Failed to create table: ${process.env.VALIDATOR_HISTORY_TABLE_NAME}`);
      throw error;
    }
  }

  // Wait for tables to be active
  console.log("⏳ Waiting for tables to become active...");
  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function copyProductionData(): Promise<void> {
  // Production client
  const prodClient = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: PRODUCTION_REGION
  }));

  // Local client  
  const localClient = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: "local",
    endpoint: LOCAL_ENDPOINT
  }));

  // Copy validators data with pagination
  if (process.env.PROD_VALIDATORS_TABLE_NAME && process.env.VALIDATORS_TABLE_NAME) {
    try {
      console.log(`📥 Copying validators from ${process.env.PROD_VALIDATORS_TABLE_NAME}...`);
      const limit = COPY_LIMITS.validators;
      if (limit > 0) {
        console.log(`📊 Limit set to ${limit} items`);
      }
      
      let lastEvaluatedKey: Record<string, any> | undefined = undefined;
      let totalValidators = 0;
      let pageNum = 0;

      do {
        pageNum++;
        const validatorsData = await prodClient.send(new ScanCommand({
          TableName: process.env.PROD_VALIDATORS_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 100
        }));

        if (validatorsData.Items && validatorsData.Items.length > 0) {
          for (const item of validatorsData.Items) {
            if (limit > 0 && totalValidators >= limit) break;
            
            await localClient.send(new PutCommand({
              TableName: process.env.VALIDATORS_TABLE_NAME,
              Item: item
            }));
            totalValidators++;
          }
          console.log(`📄 Validators page ${pageNum}: Copied ${Math.min(validatorsData.Items.length, limit > 0 ? limit - (totalValidators - validatorsData.Items.length) : validatorsData.Items.length)} items. Total so far: ${totalValidators}`);
        }

        lastEvaluatedKey = validatorsData.LastEvaluatedKey;
        
        // Break if we've reached the limit
        if (limit > 0 && totalValidators >= limit) break;
      } while (lastEvaluatedKey);

      console.log(`✅ Copied ${totalValidators} validators total`);
    } catch (error) {
      console.warn("⚠️ Could not copy validators data:", error);
    }
  }

  // Copy node operators data with pagination
  if (process.env.PROD_NODE_OPERATORS_TABLE_NAME && process.env.NODE_OPERATORS_TABLE_NAME) {
    try {
      console.log(`📥 Copying node operators from ${process.env.PROD_NODE_OPERATORS_TABLE_NAME}...`);
      const limit = COPY_LIMITS.nodeOperators;
      if (limit > 0) {
        console.log(`📊 Limit set to ${limit} items`);
      }
      
      let lastEvaluatedKey: Record<string, any> | undefined = undefined;
      let totalOperators = 0;
      let pageNum = 0;

      do {
        pageNum++;
        const operatorsData = await prodClient.send(new ScanCommand({
          TableName: process.env.PROD_NODE_OPERATORS_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 10
        }));

        if (operatorsData.Items && operatorsData.Items.length > 0) {
          for (const item of operatorsData.Items) {
            if (limit > 0 && totalOperators >= limit) break;
            
            await localClient.send(new PutCommand({
              TableName: process.env.NODE_OPERATORS_TABLE_NAME,
              Item: item
            }));
            totalOperators++;
          }
          console.log(`📄 Operators page ${pageNum}: Copied ${Math.min(operatorsData.Items.length, limit > 0 ? limit - (totalOperators - operatorsData.Items.length) : operatorsData.Items.length)} items. Total so far: ${totalOperators}`);
        }

        lastEvaluatedKey = operatorsData.LastEvaluatedKey;
        
        // Break if we've reached the limit
        if (limit > 0 && totalOperators >= limit) break;
      } while (lastEvaluatedKey);

      console.log(`✅ Copied ${totalOperators} node operators total`);
    } catch (error) {
      console.warn("⚠️ Could not copy node operators data:", error);
    }
  }

  // Copy network stats data with pagination
  if (process.env.PROD_NETWORK_STATS_TABLE_NAME && process.env.NETWORK_STATS_TABLE_NAME) {
    try {
      console.log(`📥 Copying network stats from ${process.env.PROD_NETWORK_STATS_TABLE_NAME}...`);
      const limit = COPY_LIMITS.networkStats;
      if (limit > 0) {
        console.log(`📊 Limit set to ${limit} items`);
      }
      
      let lastEvaluatedKey: Record<string, any> | undefined = undefined;
      let totalStats = 0;
      let pageNum = 0;

      do {
        pageNum++;
        const networkStatsData = await prodClient.send(new ScanCommand({
          TableName: process.env.PROD_NETWORK_STATS_TABLE_NAME,
          ExclusiveStartKey: lastEvaluatedKey
        }));

        if (networkStatsData.Items && networkStatsData.Items.length > 0) {
          for (const item of networkStatsData.Items) {
            if (limit > 0 && totalStats >= limit) break;
            
            await localClient.send(new PutCommand({
              TableName: process.env.NETWORK_STATS_TABLE_NAME,
              Item: item
            }));
            totalStats++;
          }
          console.log(`📄 Network stats page ${pageNum}: Copied ${Math.min(networkStatsData.Items.length, limit > 0 ? limit - (totalStats - networkStatsData.Items.length) : networkStatsData.Items.length)} items. Total so far: ${totalStats}`);
        }

        lastEvaluatedKey = networkStatsData.LastEvaluatedKey;
        
        // Break if we've reached the limit
        if (limit > 0 && totalStats >= limit) break;
      } while (lastEvaluatedKey);

      console.log(`✅ Copied ${totalStats} network stats total`);
    } catch (error) {
      console.warn("⚠️ Could not copy network stats data:", error);
    }
  }

  // // Copy validator history data with pagination
  // if (process.env.PROD_VALIDATOR_HISTORY_TABLE_NAME && process.env.VALIDATOR_HISTORY_TABLE_NAME) {
  //   try {
  //     console.log(`📥 Copying validator history from ${process.env.PROD_VALIDATOR_HISTORY_TABLE_NAME}...`);
  //     const limit = COPY_LIMITS.validatorHistory;
  //     if (limit > 0) {
  //       console.log(`📊 Limit set to ${limit} items`);
  //     }
      
  //     let lastEvaluatedKey: Record<string, any> | undefined = undefined;
  //     let totalHistory = 0;
  //     let pageNum = 0;

  //     do {
  //       pageNum++;
  //       const validatorHistoryData = await prodClient.send(new ScanCommand({
  //         TableName: process.env.PROD_VALIDATOR_HISTORY_TABLE_NAME,
  //         ExclusiveStartKey: lastEvaluatedKey,
  //         Limit: 100
  //       }));

  //       if (validatorHistoryData.Items && validatorHistoryData.Items.length > 0) {
  //         for (const item of validatorHistoryData.Items) {
  //           if (limit > 0 && totalHistory >= limit) break;
            
  //           await localClient.send(new PutCommand({
  //             TableName: process.env.VALIDATOR_HISTORY_TABLE_NAME,
  //             Item: item
  //           }));
  //           totalHistory++;
  //         }
  //         console.log(`📄 Validator history page ${pageNum}: Copied ${Math.min(validatorHistoryData.Items.length, limit > 0 ? limit - (totalHistory - validatorHistoryData.Items.length) : validatorHistoryData.Items.length)} items. Total so far: ${totalHistory}`);
  //       }

  //       lastEvaluatedKey = validatorHistoryData.LastEvaluatedKey;
        
  //       // Break if we've reached the limit
  //       if (limit > 0 && totalHistory >= limit) break;
  //     } while (lastEvaluatedKey);

  //     console.log(`✅ Copied ${totalHistory} validator history records total`);
  //   } catch (error) {
  //     console.warn("⚠️ Could not copy validator history data:", error);
  //   }
  // }
}

async function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on("error", (error) => {
      reject(error);
    });
  });
} 

(async () => {
    console.log("📊 Setting up local database for testing...");
    console.log("🔄 This will create local versions of all tables:");
    console.log(`   • Node Operators: ${process.env.NODE_OPERATORS_TABLE_NAME || 'sparta-node-op-dev'}`);
    console.log(`   • Validators: ${process.env.VALIDATORS_TABLE_NAME || 'sparta-validators-dev'}`);
    console.log(`   • Network Stats: ${process.env.NETWORK_STATS_TABLE_NAME || 'sparta-network-stats-dev'}`);
    console.log(`   • Validator History: ${process.env.VALIDATOR_HISTORY_TABLE_NAME || 'sparta-validator-history-dev'}`);
    console.log("📥 Production data will be copied with the following limits:");
    console.log(`   • Validators: ${COPY_LIMITS.validators || 'unlimited'}`);
    console.log(`   • Node Operators: ${COPY_LIMITS.nodeOperators || 'unlimited'}`);
    console.log(`   • Network Stats: ${COPY_LIMITS.networkStats || 'unlimited'}`);
    console.log(`   • Validator History: ${COPY_LIMITS.validatorHistory || 'unlimited'}\n`);
    
    await setupLocalDB();
    await copyDB();
    
    console.log("\n✅ Setup complete! Local database ready for testing");
    console.log("📝 Next steps:");
    console.log("   1. Ensure your .env file has all table names configured");
    console.log("   2. Set copy limits if needed (e.g., COPY_LIMIT_VALIDATORS=100)");
    console.log("   3. Set LOCAL_DYNAMO_DB=true and DYNAMODB_ENDPOINT=http://localhost:8000");
    console.log("   4. Restart your application to use the local database");
})();