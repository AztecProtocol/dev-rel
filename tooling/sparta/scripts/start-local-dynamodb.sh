#!/bin/bash

# This script sets up a local DynamoDB instance for development testing

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Check if the DynamoDB container is already running
if docker ps | grep -q "dynamodb-local"; then
  echo "DynamoDB container is already running."
else
  echo "Starting DynamoDB local container..."
  docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -sharedDb
  echo "DynamoDB local started on port 8000"
fi

# Create the node operators table with the required schema
echo "Creating node operators table..."
aws dynamodb create-table \
  --table-name sparta-node-operators-dev \
  --attribute-definitions \
    AttributeName=discordId,AttributeType=S \
    AttributeName=walletAddress,AttributeType=S \
  --key-schema AttributeName=discordId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "WalletAddressIndex",
      "KeySchema": [{"AttributeName": "walletAddress", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000

# Check if node operators table creation was successful
if [ $? -eq 0 ]; then
  echo "Table sparta-node-operators-dev created successfully"
else
  echo "Table sparta-node-operators-dev may already exist, trying to use existing table"
fi

# Create the validators table with the required schema
echo "Creating validators table..."
aws dynamodb create-table \
  --table-name sparta-validators-dev \
  --attribute-definitions \
    AttributeName=validatorAddress,AttributeType=S \
    AttributeName=nodeOperatorId,AttributeType=S \
  --key-schema AttributeName=validatorAddress,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "NodeOperatorIndex",
      "KeySchema": [{"AttributeName": "nodeOperatorId", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000

# Check if validators table creation was successful
if [ $? -eq 0 ]; then
  echo "Table sparta-validators-dev created successfully"
else
  echo "Table sparta-validators-dev may already exist, trying to use existing table"
fi

# List tables to confirm
echo "Available tables in local DynamoDB:"
aws dynamodb list-tables --endpoint-url http://localhost:8000

echo "DynamoDB local setup complete. You can now run your application with:"
echo "LOCAL_DYNAMO_DB=true DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 NODE_OPERATORS_TABLE_NAME=sparta-node-operators-dev VALIDATORS_TABLE_NAME=sparta-validators-dev npm run dev" 
