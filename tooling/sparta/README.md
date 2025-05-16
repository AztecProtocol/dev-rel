# Sparta Discord Bot

A Discord bot for managing Aztec validators and community roles, built with Bun/TypeScript and deployed on AWS.

## Project Overview

Sparta is a Discord bot designed to manage and monitor Aztec validators and community roles within a Discord server:

- **Validator Management**: Commands to register, remove, and monitor validators
- **Role Management**: Assigns roles based on user scores
- **Chain Monitoring**: Retrieves and displays blockchain data like blocks, epochs, slots
- **API Integration**: RESTful API for integration with other services

## Architecture

The project follows a modular structure with several packages:

```
sparta/
├── packages/
│   ├── discord/     # Discord bot and command handling
│   ├── ethereum/    # Ethereum blockchain integration
│   ├── utils/       # Shared utilities
│   ├── api/         # Express API server (package.json: @sparta/api)
│   └── scheduler/   # Lambda-based validator monitoring
├── terraform/       # Infrastructure as code
└── scripts/         # Utility scripts
```

### Key Components

- **Discord Bot** (@sparta/discord): Core Discord integration for slash commands and messaging
- **Ethereum Client** (@sparta/ethereum): Blockchain interaction for validator management
- **API Server** (@sparta/api): RESTful API for integration and validator management
- **Scheduler** (@sparta/scheduler): AWS Lambda for automated validator monitoring
- **Utils** (@sparta/utils): Shared utilities for logging, DynamoDB, and constants

## Local Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+ (package manager and runtime)
- Node.js v18+
- AWS CLI configured
- Discord Bot Token from [Discord Developer Portal](https://discord.com/developers/applications)

### Setup

1. Clone the repository
2. Install dependencies:
```bash
cd sparta
bun install
```

3. Create a `.env` file with required environment variables:
```
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token
BOT_CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_server_id

# API Configuration
API_PORT=3000
API_URL=http://localhost:3000

# Ethereum Configuration
ETHEREUM_HOST=your_ethereum_rpc_url
L1_CHAIN_ID=11155111
STAKING_ASSET_HANDLER_ADDRESS=your_contract_address

# DynamoDB Configuration
LOCAL_DYNAMO_DB=true
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000

# Logging
LOG_LEVEL=debug
LOG_PRETTY_PRINT=true
```

4. Start local DynamoDB:
```bash
bun run scripts/start-local-dynamodb.sh
```

5. Run the project:
```bash
# Run API and Discord bot
bun run dev

# Run only API
bun run dev:api

# Run only scheduler
bun run dev:scheduler
```

## Deployment

The project is deployed using Terraform to AWS services:

- **Discord Bot & API**: AWS Elastic Container Service (ECS)
- **Validator Monitor**: AWS Lambda + EventBridge
- **Database**: DynamoDB
- **Infrastructure**: Load Balancer, IAM roles, Security Groups

### Deployment Process

1. Configure AWS credentials
2. Update Terraform variables in `terraform/terraform.tfvars`
3. Deploy using:

```bash
cd terraform
terraform init
terraform apply
```

Alternatively, use the GitHub Actions workflow:

1. Configure GitHub repository secrets
2. Trigger the "Terraform Deploy" workflow

## Configuration

The application can be configured through environment variables and Terraform variables. See individual package READMEs for specific configuration options.

## Development Workflow

1. Make changes to source code
2. Run tests locally
3. Create a pull request
4. Upon approval, merge to main branch
5. Deploy using Terraform

## Terraform Workflow Details

The GitHub Actions workflow located in `.github/workflows/terraform-deploy.yml` handles automated deployment:

1. Checks out code
2. Sets up Terraform
3. Initializes Terraform
4. Validates configuration
5. Deploys infrastructure

The workflow uses repository secrets for sensitive information.

## Packages

- **@sparta/utils**: Common utilities for logging, DynamoDB, constants, and OpenAPI
- **@sparta/ethereum**: Ethereum blockchain connectivity and validator management
- **@sparta/discord**: Discord bot integration and command handling
- **@sparta/api**: Express API server for RESTful endpoints
- **@sparta/scheduler**: AWS Lambda for scheduled validator monitoring
