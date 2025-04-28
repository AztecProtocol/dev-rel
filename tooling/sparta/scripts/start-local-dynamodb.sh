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

# Create the users table with the required schema
echo "Creating users table..."
aws dynamodb create-table \
  --table-name users \
  --attribute-definitions \
    AttributeName=discordUserId,AttributeType=S \
    AttributeName=walletAddress,AttributeType=S \
    AttributeName=verificationId,AttributeType=S \
  --key-schema AttributeName=discordUserId,KeyType=HASH \
  --global-secondary-indexes '[
    {
      "IndexName": "walletAddress-index",
      "KeySchema": [{"AttributeName": "walletAddress", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["discordUserId", "discordUsername"]},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    },
    {
      "IndexName": "verificationId-index",
      "KeySchema": [{"AttributeName": "verificationId", "KeyType": "HASH"}],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }
  ]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000

# Check if table creation was successful
if [ $? -eq 0 ]; then
  echo "Table users created successfully"
else
  echo "Table users may already exist, trying to use existing table"
fi

# List tables to confirm
echo "Available tables in local DynamoDB:"
aws dynamodb list-tables --endpoint-url http://localhost:8000

echo "DynamoDB local setup complete. You can now run your application with:"
echo "IS_LOCAL=true DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000 USER_TABLE_NAME=users npm run dev" 
