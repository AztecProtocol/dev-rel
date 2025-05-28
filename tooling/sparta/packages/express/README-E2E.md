# E2E Testing Guide

## Quick Start
1. Ensure Docker is running: `docker info`
2. Set environment variables (see below)
3. Run tests: `bun run test:e2e`

## Environment Variables
```bash
# Required
INFURA_URL=https://mainnet.infura.io/v3/YOUR_KEY
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Optional
FORK_BLOCK_NUMBER=19000000
API_KEY=test-key
```

## What It Does
1. Starts DynamoDB Local in Docker (port 8000)
2. Copies production data to local tables
3. Starts Hardhat blockchain fork (port 8545)
4. Starts API server (port 3001)
5. Tests node operator operations
6. Cleans up all services

## Troubleshooting
- **Docker conflicts**: `docker stop dynamodb-local && docker rm dynamodb-local`
- **Port issues**: Make sure ports 3001, 8000, 8545 are free
- **AWS errors**: Check your credentials and permissions

## Overview

The E2E test suite performs comprehensive testing of the node operator lifecycle by:

### Prepare Phase
1. **Database Setup**: Starts DynamoDB Local in Docker and copies production data
2. **Blockchain Fork**: Sets up a forked Ethereum blockchain using Hardhat Network

### Test Phase
- Gets all node operators
- Creates a new node operator
- Retrieves the created operator
- Updates the operator's wallet address
- Retrieves operator by new wallet address
- Approves the operator
- Unapproves the operator
- Deletes the operator
- Verifies all operations completed successfully

## Prerequisites

### Required Software
- **Docker** (for DynamoDB Local)
- **Node.js and npm** (for Hardhat)
- **Bun** (for running the tests)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
VALIDATORS_TABLE_NAME=sparta-validators-dev
NODE_OPERATORS_TABLE_NAME=sparta-node-operators-dev
DYNAMODB_ENDPOINT=http://localhost:8000

# Blockchain Configuration (choose one)
INFURA_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
# OR
ALCHEMY_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
# OR
ETHEREUM_RPC_URL=https://your-ethereum-rpc-url

# Optional: Pin to specific block for consistent testing
FORK_BLOCK_NUMBER=19000000

# API Configuration
API_KEY=your-test-api-key
API_PORT=3001

# AWS Configuration (for copying production data)
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

## Installation & Setup

### Quick Start
1. Ensure Docker is running: `docker info`
2. Run setup script: `chmod +x scripts/setup-e2e.sh && ./scripts/setup-e2e.sh`
3. Run tests: `bun run test:e2e`

## Running the Tests

### Run All E2E Tests
```bash
bun run test:e2e
```

### Run Tests with Specific Configuration
```bash
# Pin to specific block for consistent results
FORK_BLOCK_NUMBER=19000000 bun run test:e2e

# Use specific RPC endpoint
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-key bun run test:e2e
```

## Test Structure

### Main Test File
- `e2e.test.ts` - Main test suite with setup/teardown and test scenarios

### Helper Modules
- `src/tests/db-setup.ts` - Database setup utilities (direct Docker management)
- `src/tests/hardhat-setup.ts` - Blockchain fork management

## Architecture

The E2E test architecture follows this flow:

```
Test Start
    ↓
Start DynamoDB Docker container (port 8000)
    ↓
Copy Production Data → Local DynamoDB
    ↓
Start Hardhat Fork (port 8545)
    ↓
Start API Server (port 3001)
    ↓
Run Test Scenarios
    ↓
Cleanup (Stop all services)
    ↓
Test Complete
```

## Troubleshooting

### Common Issues

1. **Docker not running**
   - Start Docker Desktop or Docker daemon
   - Verify with: `docker info`

2. **DynamoDB container conflicts**
   - Stop existing container: `docker stop dynamodb-local`
   - Remove container: `docker rm dynamodb-local`
   - Re-run tests

3. **Hardhat fork fails**
   - Verify your RPC URL is correct and accessible
   - Check if you have sufficient API credits
   - Ensure port 8545 is available

4. **Production data copy fails**
   - Verify AWS credentials are correct
   - Check if production tables exist
   - Ensure proper IAM permissions for DynamoDB access

### Manual Docker Commands

```bash
# Start DynamoDB container directly
docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -sharedDb

# Stop and remove container
docker stop dynamodb-local && docker rm dynamodb-local

# View container logs
docker logs dynamodb-local
```

## Performance Tips

- **Direct Docker**: Simple and reliable container management
- **Block Pinning**: Use `FORK_BLOCK_NUMBER` for consistent results
- **Clean State**: Each test run starts with a fresh DynamoDB container 