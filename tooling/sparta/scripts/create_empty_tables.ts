import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, ListTablesCommand } from "@aws-sdk/client-dynamodb";

const LOCAL_ENDPOINT = "http://localhost:8000";

export async function createEmptyTables(): Promise<void> {
  try {
    console.log("🗑️  Cleaning up existing tables...");
    await cleanupLocalTables();
    
    console.log("🏗️  Creating empty tables...");
    await createLocalTables();
    
    console.log("✅ Empty database setup complete!");
  } catch (error) {
    console.error({ error }, "Failed to setup database");
    throw error;
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
  await new Promise(resolve => setTimeout(resolve, 3000));
}

// Run the script if called directly
(async () => {
    console.log("📊 Setting up empty local database...");
    console.log("🔄 This will create empty local versions of all tables:");
    console.log(`   • Node Operators: ${process.env.NODE_OPERATORS_TABLE_NAME || 'sparta-node-op-dev'}`);
    console.log(`   • Validators: ${process.env.VALIDATORS_TABLE_NAME || 'sparta-validators-dev'}`);
    console.log(`   • Network Stats: ${process.env.NETWORK_STATS_TABLE_NAME || 'sparta-network-stats-dev'}`);
    console.log(`   • Validator History: ${process.env.VALIDATOR_HISTORY_TABLE_NAME || 'sparta-validator-history-dev'}\n`);
    
    await createEmptyTables();
    
    console.log("\n✅ Setup complete! Empty local database ready for development");
    console.log("📝 Next steps:");
    console.log("   1. Ensure your .env file has all table names configured");
    console.log("   2. Set LOCAL_DYNAMO_DB=true and DYNAMODB_ENDPOINT=http://localhost:8000");
    console.log("   3. Run 'bun run dev' to start your application");
})(); 