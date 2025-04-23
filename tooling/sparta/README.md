# Sparta Discord Bot

A Discord bot for managing Aztec validators and community roles, built with Bun/TypeScript and deployed on AWS Elastic Beanstalk.

## Overview

Sparta is a Discord bot designed to manage and monitor Aztec validators and community roles within the Discord server. It provides:

- **Role Management**: Automatically assigns roles based on user scores from Google Sheets
- **Validator Management**: Commands to add, remove, and check validators
- **Chain Information**: Retrieves blockchain data like pending blocks, proven blocks, epochs, slots
- **Discord Integration**: Full integration with Discord slash commands

## Prerequisites

- [Bun](https://bun.sh) v1.0 or higher (used as runtime and package manager)
- Node.js v18 or higher (for development tools)
- AWS CLI configured with appropriate credentials
- Terraform v1.0 or higher
- Discord Bot Token and Application ID from [Discord Developer Portal](https://discord.com/developers/applications)
- Ethereum node access (local or remote)
- Google Sheets API access (for role management)

## Security Notice

⚠️ **Important**: This project uses sensitive credentials that should never be committed to version control:
- Discord bot tokens
- Ethereum private keys
- AWS credentials
- Google Sheets API credentials
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
├── src/                      # Source code
│   ├── clients/              # External API clients (Discord, Ethereum, Google)
│   ├── roles/                # Role-specific Discord commands
│   │   ├── nodeOperators/    # Commands for Node Operator role 
│   │   └── admins/           # Admin-only commands
│   ├── services/             # Business logic services
│   │   ├── chaininfo-service.ts    # Chain information retrieval
│   │   ├── discord-service.ts      # Discord role management
│   │   ├── googlesheet-service.ts  # Google Sheets integration
│   │   ├── validator-service.ts    # Validator management
│   │   └── index.ts                # Service exports
│   └── utils/                # Utility functions
├── terraform/                # Infrastructure as Code
└── Dockerfile                # Docker configuration
```

## Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd sparta
```

2. Install dependencies using Bun:
```bash
cd src
bun install
```

3. Create a `.env` file in the `src` directory using `.env.example` as a template:
```bash
cp .env.example .env
```

4. Fill in the required environment variables in `.env`. Required variables include:
```
# Discord Bot Configuration
BOT_TOKEN=your_bot_token
BOT_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Ethereum Configuration
ETHEREUM_HOST=http://localhost:8545
MINTER_PRIVATE_KEY=your_private_key
STAKING_ASSET_HANDLER_ADDRESS=your_registry_address
WITHDRAWER_ADDRESS=address_to_withdraw_funds_to
ETHEREUM_CHAIN_ID=1337
ETHEREUM_VALUE=20ether
MINIMUM_STAKE=100000000000000000000
APPROVAL_AMOUNT=10000000000000000000000

# Google Sheets Configuration
GOOGLE_API_KEY=your_api_key
SPREADSHEET_ID=your_spreadsheet_id
```

5. Start the bot in development mode with hot reloading:
```bash
bun run dev
```

6. For building a production version:
```bash
bun run build
```

7. To start the production version:
```bash
bun run start
```

## Building with Docker

1. Build the Docker image:
```bash
docker build -t sparta-bot .
```

2. Run the container:
```bash
docker run -d --name sparta-bot --env-file ./src/.env sparta-bot
```

## Deployment with Terraform

The bot is deployed using Terraform to AWS Elastic Container Service (ECS). Follow these steps:

1. Navigate to the terraform directory:
```bash
cd terraform
```

2. Create `terraform.tfvars` using the example file:
```bash
cp terraform.tfvars.example terraform.tfvars
```

3. Fill in the required variables in `terraform.tfvars`.

4. Initialize Terraform:
```bash
terraform init
```

5. Deploy:
```bash
terraform apply
```

## Bot Functionality

### Role Management
- Monitors Google Sheets for user scores
- Assigns Discord roles based on score thresholds:
  - Node Operator (base role): Default role
  - Defender (middle role): Score > 5
  - Sentinel (highest role): Score > 10

### Validator Management
- Add validators to the blockchain
- Remove validators from the blockchain
- Check validator status and information

### Chain Information
- Get pending block number
- Get proven block number
- Check current epoch and slot
- View committee members

## Available Commands

### Node Operator Commands
- `/get-info`: Get chain information including pending block, proven block, current epoch, current slot, and proposer
- `/validator check`: Check if an address is a validator
- `/validator register`: Register a validator address
- `/validator help`: Get help for validator commands

### Admin Commands
(More details in the admin command section)

## Environment Variables

### Development
- Uses `.env` file for local configuration
- Supports hot reloading through `bun run dev`
- Environment-specific configurations (.env.local, .env.staging)

### Production
- Uses AWS Secrets Manager for secure configuration
- Automatically loads secrets in production environment
- Supports staging and production environments

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

## Monitoring and Logging

- AWS CloudWatch for container logs
- Discord command execution logging
- Error tracking and reporting
- Performance monitoring

## Logging

The application uses Pino for structured logging with the following features:

- **Multiple log levels**: trace, debug, info, warn, error, fatal
- **Colorful output**: Different colors for different log levels when pretty printing is enabled
- **Timestamps**: Each log includes an ISO timestamp
- **Request logging**: HTTP requests can be logged at the debug level
- **Structured logging**: Logs are output in JSON format for easy parsing

### Configuration

Logging can be configured through environment variables:

- `LOG_LEVEL`: Set the minimum log level (trace, debug, info, warn, error, fatal)
- `LOG_PRETTY_PRINT`: Enable/disable colorful, human-readable logs (true/false)

#### Example

```sh
# Set log level to debug and enable pretty printing
export LOG_LEVEL=debug
export LOG_PRETTY_PRINT=true
npm run dev
```

### Terraform Configuration

Logging can also be configured through Terraform variables:

```hcl
module "sparta" {
  # ...
  log_level        = "debug"
  log_pretty_print = true
}
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Support

For support, please open an issue in the repository or contact the maintainers.

## Monorepo Structure

This project is now structured as a monorepo using Bun workspaces. Packages are located in the `packages/` directory. Dependencies are managed from the root `package.json`.

To run commands within a specific package, use `bun run --filter <package-name> <script-name>`.
