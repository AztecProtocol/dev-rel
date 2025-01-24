# Sparta Discord Bot

A Discord bot for managing Aztec validators, built with Node.js and deployed on AWS Elastic Beanstalk.

## Prerequisites

- Node.js v18 or higher
- AWS CLI configured with appropriate credentials
- Terraform v1.0 or higher
- Discord Bot Token and Application ID from [Discord Developer Portal](https://discord.com/developers/applications)

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
ETHEREUM_ADMIN_ADDRESS=your_admin_address
ETHEREUM_CHAIN_ID=1337
ETHEREUM_PRIVATE_KEY=your_private_key
ETHEREUM_VALUE=20ether
```

5. Start the bot in development mode:
```bash
npm run watch
```

## Deployment

The bot is deployed using Terraform to AWS Elastic Beanstalk. Follow these steps:

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
- **AWS Elastic Beanstalk**: Hosts the bot in a scalable environment
- **AWS Secrets Manager**: Securely stores sensitive configuration
- **TypeScript**: Provides type safety and better development experience

## Environment Variables

### Development
- Uses `.env` file for local configuration
- Supports hot reloading through `npm run watch`

### Production
- Uses AWS Secrets Manager for secure configuration
- Automatically loads secrets in production environment
- Supports staging and production environments

## Commands

- `/get-info`: Get chain information
- `/admin validators get`: List validators
- `/admin validators remove`: Remove a validator
- `/admin committee get`: Get committee information

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Security

- All sensitive information is stored in AWS Secrets Manager
- IAM roles are configured with least privilege
- Environment variables are never committed to version control
- SSH access is controlled via key pairs
- No sensitive information in logs or error messages

## License

[Your License]
