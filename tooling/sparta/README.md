# Sparta Discord Bot

A Discord bot for managing Aztec validators, built with Node.js and deployed on AWS Elastic Beanstalk.

## Overview

Sparta is a Discord bot designed to manage and monitor Aztec validators. It provides commands for:
- Validator management (add, remove, list)
- Chain information retrieval
- Committee management
- Stake management

## Prerequisites

- Node.js v18 or higher
- AWS CLI configured with appropriate credentials
- Terraform v1.0 or higher
- Discord Bot Token and Application ID from [Discord Developer Portal](https://discord.com/developers/applications)
- Ethereum node access (local or remote)

## Security Notice

⚠️ **Important**: This project uses sensitive credentials that should never be committed to version control:
- Discord bot tokens
- Ethereum private keys
- AWS credentials
- Environment variables

Always use:
- `.env` files for local development (never commit these)
- AWS Secrets Manager for production secrets
- `terraform.tfvars` for Terraform variables (never commit this)
- Ensure `.gitignore` includes all sensitive files
- Use environment-specific configuration files

## Project Structure

```
sparta/
├── src/                    # Source code
│   ├── commands/          # Discord bot commands
│   ├── discord/           # Discord bot setup
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── admins/            # Admin-only commands
├── terraform/             # Infrastructure as Code
└── docker/               # Docker configuration
```

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd sparta
```

2. Install dependencies:
```bash
cd src
npm install
```

3. Create a `.env` file in the `src` directory using `.env.example` as a template:
```bash
cp .env.example .env
```

4. Fill in the required environment variables in `.env`:
```
# Discord Bot Configuration
BOT_TOKEN=your_bot_token
BOT_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Ethereum Configuration
ETHEREUM_HOST=http://localhost:8545
ETHEREUM_ROLLUP_ADDRESS=your_rollup_address
ETHEREUM_CHAIN_ID=1337
MINTER_PRIVATE_KEY=your_private_key
WITHDRAWER_ADDRESS=address_to_withdraw_funds_to
ETHEREUM_VALUE=20ether
APPROVAL_AMOUNT=some_amount
```

5. Start the bot in development mode:
```bash
npm run watch
```

## Deployment

The bot is deployed using Terraform to AWS Elastic Container Service (ECS). Follow these steps:

1. Navigate to the terraform directory:
```bash
cd terraform
```

2. Create `terraform.tfvars` using the example file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

3. Fill in the required variables in `terraform.tfvars`:
```hcl
environment         = "production"
aws_region         = "us-west-2"
bot_token          = "your_bot_token"
bot_client_id      = "your_client_id"
guild_id           = "your_guild_id"
ethereum_host      = "your_ethereum_host"
# ... other variables
```

4. Initialize Terraform:
```bash
terraform init
```

5. Deploy:
```bash
terraform apply
```

## Architecture

- **Discord.js**: Handles bot interactions and commands
- **AWS ECS**: Runs the bot in containers for high availability
- **AWS Secrets Manager**: Securely stores sensitive configuration
- **TypeScript**: Provides type safety and better development experience
- **Terraform**: Manages infrastructure as code
- **Docker**: Containerizes the application

## Environment Variables

### Development
- Uses `.env` file for local configuration
- Supports hot reloading through `npm run watch`
- Environment-specific configurations (.env.local, .env.staging)

### Production
- Uses AWS Secrets Manager for secure configuration
- Automatically loads secrets in production environment
- Supports staging and production environments

## Available Commands

### User Commands
- `/get-info`: Get chain information
- `/validator info`: Get validator information

### Admin Commands
- `/admin validators get`: List validators
- `/admin validators add`: Add a validator
- `/admin validators remove`: Remove a validator
- `/admin committee get`: Get committee information
- `/admin stake manage`: Manage validator stakes

## Security Best Practices

1. **Environment Variables**
   - Never commit .env files
   - Use different env files for different environments
   - Rotate secrets regularly

2. **AWS Security**
   - Use IAM roles with least privilege
   - Enable CloudWatch logging
   - Use security groups to restrict access

3. **Discord Security**
   - Implement command permissions
   - Use ephemeral messages for sensitive info
   - Validate user inputs

4. **Ethereum Security**
   - Never expose private keys
   - Use secure RPC endpoints
   - Implement transaction signing safeguards

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Monitoring and Logging

- AWS CloudWatch for container logs
- Discord command execution logging
- Error tracking and reporting
- Performance monitoring

## Support

For support, please open an issue in the repository or contact the maintainers.
