import { spawn } from "child_process";
import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const PRODUCTION_REGION = process.env.AWS_REGION || "eu-west-2";
const LOCAL_ENDPOINT = "http://localhost:8000";

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
    await copyProductionData();
    
    console.log("✅ Database setup complete!");
  } catch (error) {
    console.error({ error }, "Failed to setup database");
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
      process.env.NETWORK_STATS_TABLE_NAME
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

  // Create node operators table
  console.log(`🏗️  Creating table: ${process.env.NODE_OPERATORS_TABLE_NAME}`);
  try {
    await localClient.send(new CreateTableCommand({
      TableName: process.env.NODE_OPERATORS_TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: "discordId",
          AttributeType: "S",
        },
        {
          AttributeName: "walletAddress",
          AttributeType: "S",
        },
      ],
      KeySchema: [
        {
          AttributeName: "discordId",
          KeyType: "HASH", // Partition key
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "WalletAddressIndex",
          KeySchema: [
            {
              AttributeName: "walletAddress",
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
  try {
    console.log(`📥 Copying data from ${process.env.PROD_VALIDATORS_TABLE_NAME}...`);
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;
    let totalValidators = 0;
    let pageNum = 0;

    do {
      pageNum++;
      const validatorsData = await prodClient.send(new ScanCommand({
        TableName: process.env.PROD_VALIDATORS_TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey
      }));

      if (validatorsData.Items && validatorsData.Items.length > 0) {
        for (const item of validatorsData.Items) {
          await localClient.send(new PutCommand({
            TableName: process.env.VALIDATORS_TABLE_NAME,
            Item: item
          }));
        }
        totalValidators += validatorsData.Items.length;
        console.log(`📄 Validators page ${pageNum}: Copied ${validatorsData.Items.length} items. Total so far: ${totalValidators}`);
      }

      lastEvaluatedKey = validatorsData.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`✅ Copied ${totalValidators} validators total`);
  } catch (error) {
    console.warn("⚠️ Could not copy validators data:", error);
  }

  // Copy node operators data with pagination
  try {
    console.log(`📥 Copying data from ${process.env.PROD_NODE_OPERATORS_TABLE_NAME}...`);
    let lastEvaluatedKey: Record<string, any> | undefined = undefined;
    let totalOperators = 0;
    let pageNum = 0;

    do {
      pageNum++;
      const operatorsData = await prodClient.send(new ScanCommand({
        TableName: process.env.PROD_NODE_OPERATORS_TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey
      }));

      if (operatorsData.Items && operatorsData.Items.length > 0) {
        for (const item of operatorsData.Items) {
          await localClient.send(new PutCommand({
            TableName: process.env.NODE_OPERATORS_TABLE_NAME,
            Item: item
          }));
        }
        totalOperators += operatorsData.Items.length;
        console.log(`📄 Operators page ${pageNum}: Copied ${operatorsData.Items.length} items. Total so far: ${totalOperators}`);
      }

      lastEvaluatedKey = operatorsData.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`✅ Copied ${totalOperators} node operators total`);
  } catch (error) {
    console.warn("⚠️ Could not copy node operators data:", error);
  }

  // Copy network stats data with pagination
  try {
    console.log(`📥 Copying data from ${process.env.PROD_NETWORK_STATS_TABLE_NAME}...`);
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
          await localClient.send(new PutCommand({
            TableName: process.env.NETWORK_STATS_TABLE_NAME,
            Item: item
          }));
        }
        totalStats += networkStatsData.Items.length;
        console.log(`📄 Network stats page ${pageNum}: Copied ${networkStatsData.Items.length} items. Total so far: ${totalStats}`);
      }

      lastEvaluatedKey = networkStatsData.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`✅ Copied ${totalStats} network stats total`);
  } catch (error) {
    console.warn("⚠️ Could not copy network stats data:", error);
  }
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
    console.log("📊 Setting up local database...");
    await setupLocalDB();
    await copyDB();
})();