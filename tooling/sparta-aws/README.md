# Sparta AWS Infrastructure

This is the AWS infrastructure version of the Sparta Discord bot for managing validators. It uses serverless architecture with AWS Lambda, API Gateway, and other AWS services.

## Architecture

- AWS Lambda for the Discord bot logic
- API Gateway for Discord webhook endpoints
- DynamoDB for state management (if needed)
- CloudWatch for logging and monitoring
- ECR for Docker container storage
- Parameter Store for secrets
- CloudWatch Alarms for monitoring

## Prerequisites

1. AWS CLI installed and configured
2. Terraform installed
3. Node.js 18.x or later
4. Discord bot token and application ID
5. Required environment variables (see below)

## Setup

1. Create a `.env` file based on `.env.example`
2. Deploy the infrastructure:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```
3. Deploy the Lambda function:
   ```bash
   cd src
   npm install
   npm run build
   npm run deploy
   ```

## Environment Variables

Required environment variables in AWS Parameter Store:

- `/sparta/discord/bot_token`
- `/sparta/discord/client_id`
- `/sparta/discord/guild_id`
- `/sparta/discord/prod_channel_id`
- `/sparta/discord/dev_channel_id`
- `/sparta/ethereum/host`
- `/sparta/ethereum/rollup_address`
- `/sparta/ethereum/admin_address`
- `/sparta/ethereum/chain_id`
- `/sparta/ethereum/mnemonic`
- `/sparta/ethereum/private_key`
- `/sparta/ethereum/value`

## Architecture Details

### Lambda Function
The main bot logic runs in a Lambda function, triggered by API Gateway when Discord sends webhook events.

### API Gateway
Handles incoming webhook requests from Discord and routes them to the appropriate Lambda function.

### CloudWatch
All Lambda function logs are automatically sent to CloudWatch Logs. CloudWatch Alarms monitor for errors and latency.

### Parameter Store
Stores all sensitive configuration values securely.

### ECR
Stores the Docker container used for validator operations (implementation pending).

## Monitoring

CloudWatch dashboards and alarms are set up to monitor:
- Lambda function errors
- API Gateway latency
- Lambda function duration
- Lambda function throttles
- API Gateway 4xx/5xx errors

## Security

- All secrets are stored in AWS Parameter Store
- IAM roles follow least privilege principle
- API Gateway endpoints are secured with Discord signature verification
- Network access is restricted where possible 
