# Sparta Discord Bot

A comprehensive Discord bot system for managing Aztec validators and community roles, built with Bun/TypeScript and deployed on AWS.

## 🎯 Project Overview

Sparta is a modular Discord bot ecosystem designed specifically for the Aztec blockchain community. It provides:

### Core Features
- **🔗 Validator Management**: Complete lifecycle management for Aztec validators including registration, monitoring, and slashing detection
- **👥 Role Management**: Automated Discord role assignment based on validator performance and community participation
- **📊 Blockchain Monitoring**: Real-time monitoring of Aztec network blocks, epochs, slots, and validator status
- **🔌 API Integration**: RESTful API for external service integration and web interface
- **⚡ Automated Monitoring**: Lambda-based scheduled monitoring with alerting capabilities

### Use Cases
- **Community Management**: Discord server administration for Aztec validator communities
- **Validator Operations**: Tools for validator operators to register, monitor, and manage their nodes
- **Network Monitoring**: Real-time insights into Aztec network health and performance
- **Compliance Tracking**: Automated monitoring for validator performance and slashing events

## 🏗️ Architecture

The project follows a modern microservices architecture with clear separation of concerns:

```
sparta/
├── packages/
│   ├── discord/     # Discord bot implementation and command handling
│   ├── express/     # REST API server with OpenAPI documentation
│   ├── ethereum/    # Ethereum/Aztec blockchain integration layer
│   ├── utils/       # Shared utilities (logging, DynamoDB, constants)
│   ├── scheduler/   # AWS Lambda for automated validator monitoring
│   └── e2e/         # End-to-end testing suite
├── terraform/       # Infrastructure as Code (AWS deployment)
├── scripts/         # Utility scripts for operations and deployment
└── .github/         # CI/CD workflows
```

### Package Responsibilities

| Package | Purpose | Key Features |
|---------|---------|--------------|
| **@sparta/discord** | Discord bot integration | Slash commands, role management, user interactions |
| **@sparta/express** | REST API server | Validator endpoints, monitoring APIs, OpenAPI docs |
| **@sparta/ethereum** | Blockchain connectivity | Validator registration, network queries, smart contracts |
| **@sparta/utils** | Shared utilities | DynamoDB client, logging, migration system, constants |
| **@sparta/scheduler** | Automated monitoring | Lambda functions, scheduled tasks, alerting |
| **@sparta/e2e** | Testing suite | End-to-end tests, integration testing |

### Technology Stack
- **Runtime**: Bun (JavaScript/TypeScript runtime and package manager)
- **Language**: TypeScript with strict type checking
- **Database**: AWS DynamoDB for scalable NoSQL storage
- **Infrastructure**: AWS (ECS, Lambda, ALB, CloudWatch)
- **Blockchain**: Viem for Ethereum/Aztec chain interactions
- **Discord**: Discord.js v14 for bot functionality
- **API**: Express.js with OpenAPI/Swagger documentation

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **[Bun](https://bun.sh)** v1.0+ (package manager and runtime)
- **Node.js** v18+ (for compatibility)
- **Docker** and **Docker Compose** (for local development)
- **AWS CLI** configured (for deployment)
- **Terraform** v1.0+ (for infrastructure management)

### Initial Setup

1. **Clone and Install Dependencies**:
```bash
cd tooling/sparta
bun install
```

2. **Environment Configuration**:
Create a `.env` file with required variables:
```bash
# Discord Bot Configuration
BOT_TOKEN=your_discord_bot_token                    # From Discord Developer Portal
BOT_CLIENT_ID=your_discord_client_id               # Discord application client ID
GUILD_ID=your_discord_server_id                    # Target Discord server ID

# API Configuration
API_PORT=3000                                       # API server port
API_URL=http://localhost:3000                       # API base URL
BACKEND_API_KEY=your_secure_api_key                # API authentication key

# Ethereum/Aztec Configuration
ETHEREUM_HOST=your_ethereum_rpc_url                # Ethereum node endpoint
L1_CHAIN_ID=11155111                               # Sepolia testnet
STAKING_ASSET_HANDLER_ADDRESS=0xcontract_address   # Staking contract address
SPARTA_ADDRESS=0xwallet_address                    # Bot wallet address
SPARTA_PRIVATE_KEY=0xprivate_key                   # Bot wallet private key

# DynamoDB Configuration
LOCAL_DYNAMO_DB=true                               # Use local DynamoDB for development
DYNAMODB_ENDPOINT=http://localhost:8000           # Local DynamoDB endpoint
PROD_VALIDATORS_TABLE_NAME=sparta-production-validators # If you intend to copy the production DB
PROD_NODE_OPERATORS_TABLE_NAME=sparta-production-node-operators  # If you intend to copy the production DB
NODE_OPERATORS_TABLE_NAME=sparta-node-operators-dev
VALIDATORS_TABLE_NAME=sparta-validators-dev

# Logging Configuration
LOG_LEVEL=debug                                    # Log verbosity (debug/info/warn/error)
LOG_PRETTY_PRINT=true                             # Human-readable logs for development

# Aztec Network Configuration
AZTEC_RPC_URL=http://aztec-node-url:8080          # Aztec network RPC endpoint
FUNDER_AMOUNT=0.1                                  # ETH amount for funding operations
```

3. **Get Discord Bot Credentials**:
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot
   - Copy the bot token and client ID
   - Invite the bot to your server with appropriate permissions

## 🛠️ Development Workflow

### Development Environment

Start the complete development stack with all dependencies:

```bash
# 1. Start supporting services (DynamoDB + Anvil blockchain)
docker-compose -f docker-compose.dev.yml up -d

# 2. Optional: Copy production data for realistic testing
bun run setup:db

# 3. Start development servers with hot reload
bun run dev
```

This will start:
- **DynamoDB Local**: Local database on port 8000
- **Anvil**: Local Ethereum testnet on port 8545
- **Discord Bot**: With live command registration
- **API Server**: REST API with OpenAPI docs on port 3000

### Individual Component Development

For focused development on specific components:

```bash
# API server only
bun run dev:api

# Discord bot only (requires API to be running)
bun run dev:discord

# Scheduler/Lambda functions only
bun run dev:scheduler
```

### Available Commands

| Command | Purpose | Description |
|---------|---------|-------------|
| `bun run types` | Type checking | Validate TypeScript types across all packages |
| `bun run build` | Build | Compile all packages for production |
| `bun run prep` | Preparation | Generate Swagger docs and OpenAPI types |
| `bun run dev` | Development | Start full development environment |
| `bun run staging` | Staging | Connect to production DB with development code |

### Database Operations

```bash
# Database migrations
bun run --filter='@sparta/utils' migration

# Backup production database
bun run --filter='@sparta/utils' backup

# Test migration (dry run)
DRY_RUN=true bun run --filter='@sparta/utils' migration
```

## 🧪 Testing Workflow

### Comprehensive Testing Environment

The testing setup provides a complete isolated environment:

```bash
# 1. Start full testing environment
docker-compose -f docker-compose.test.yml up

# 2. Copy production database (required)
bun run setup:db

# 3. Run end-to-end tests
bun run test:e2e
```

### Testing Components

The test environment includes:
- **Isolated DynamoDB**: Fresh database for each test run
- **Anvil Testnet**: Deterministic blockchain state
- **Full Sparta Stack**: API, Discord bot, and scheduler
- **Test Data**: Realistic validator and operator data

### Test Configuration

Test environment automatically configures:
- Local blockchain with funded accounts
- Test Discord server and bot tokens
- Isolated database tables
- Mock external service endpoints

### Running Specific Tests

```bash
# Unit tests for specific packages
bun --filter='@sparta/ethereum' test
bun --filter='@sparta/utils' test

# Integration tests
bun --filter='@sparta/e2e' run test:integration
```

## 🚢 Production Deployment

### AWS Infrastructure Overview

Sparta deploys to AWS using Terraform with the following architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Load Balancer  │    │   ECS Cluster   │
│   Load Balancer │◄──►│     (ALB)        │◄──►│                 │
│                 │    │                  │    │  ┌─────────────┐│
└─────────────────┘    └──────────────────┘    │  │ Discord Bot ││
                                                │  │ API Server  ││
┌─────────────────┐    ┌──────────────────┐    │  └─────────────┘│
│   CloudWatch    │    │    DynamoDB      │    └─────────────────┘
│   Monitoring    │    │    Tables        │
└─────────────────┘    └──────────────────┘    ┌─────────────────┐
                                                │ Lambda Functions│
┌─────────────────┐    ┌──────────────────┐    │                 │
│  Secrets        │    │  EventBridge     │    │ ┌─────────────┐ │
│  Manager        │    │  Scheduler       │    │ │ Validator   │ │
└────────────────┘    └──────────────────┘    │ │ Monitor     │ │
                                                │ └─────────────┘ │
                                                └─────────────────┘
```

### Deployment Process

#### 1. Infrastructure Setup

Configure Terraform variables in `terraform/terraform.production.tfvars`:

```hcl
# AWS Configuration
aws_region = "eu-west-2"
environment = "production"

# Discord Configuration
bot_token = "your_production_bot_token"
bot_client_id = "your_bot_client_id"
guild_id = "your_discord_server_id"

# Ethereum Configuration
ethereum_host = "https://your-ethereum-node.com"
staking_asset_handler_address = "0xcontract_address"
l1_chain_id = "11155111"  # Sepolia

# Production Settings
log_level = "info"
log_pretty_print = false
api_desired_count = 2
api_cpu = "1024"
api_memory = "2048"
```

#### 2. Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform
terraform init

# Plan deployment (review changes)
terraform plan -var-file=terraform.production.tfvars -out=tfplan

# Apply deployment
terraform apply tfplan
```

#### 3. Automated Deployment (GitHub Actions)

For CI/CD deployment, use the GitHub Actions workflow:

1. **Configure Repository Secrets**:
   - `AWS_ACCESS_KEY_ID`: AWS access key
   - `AWS_SECRET_ACCESS_KEY`: AWS secret key
   - `BOT_TOKEN`: Discord bot token
   - `ETHEREUM_HOST`: Ethereum node URL
   - `BACKEND_API_KEY`: API authentication key

2. **Trigger Deployment**:
   - Navigate to Actions tab in GitHub
   - Run "Terraform Deploy" workflow
   - Monitor deployment progress

#### 4. Deployment Verification

After deployment, verify the system:

```bash
# Check ECS service status
aws ecs describe-services --cluster sparta-production --services sparta-api

# Monitor CloudWatch logs
aws logs tail /ecs/sparta-bot --follow

# Test API endpoint
curl https://your-api-domain.com/health

# Verify Discord bot status in Discord server
```

### Production Configuration

#### Environment-Specific Settings

| Setting | Development | Production |
|---------|-------------|------------|
| Log Level | `debug` | `info` |
| Pretty Print | `true` | `false` |
| Task Count | 1 | 2+ |
| Auto Scaling | Disabled | Enabled |
| Health Checks | Basic | Comprehensive |

#### Monitoring and Alerting

Production deployment includes:
- **CloudWatch Metrics**: CPU, memory, request count, error rates
- **Log Aggregation**: Centralized logging with search capabilities
- **Health Checks**: Application and infrastructure health monitoring
- **Alerts**: SNS notifications for critical issues

#### Security Best Practices

- **Secrets Management**: All sensitive data stored in AWS Secrets Manager
- **Network Security**: Private subnets with security groups
- **IAM Roles**: Principle of least privilege
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Role-based access for resources

### Scaling and Performance

#### Auto Scaling Configuration

```hcl
# ECS Auto Scaling
api_min_capacity = 1
api_max_capacity = 10
api_target_cpu = 70
api_target_memory = 80

# Lambda Concurrency
lambda_reserved_concurrency = 10
lambda_provisioned_concurrency = 2
```

#### Performance Optimization

- **Database**: DynamoDB with on-demand billing and auto-scaling
- **Caching**: Application-level caching for frequently accessed data
- **CDN**: CloudFront for static assets (if applicable)
- **Connection Pooling**: Optimized database connections

## 📖 API Documentation

### OpenAPI Documentation

The API server provides comprehensive OpenAPI documentation:

- **Local Development**: `http://localhost:3000/api/docs`
- **Production**: `https://your-api-domain.com/api/docs`

### Key API Endpoints

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/health` | GET | Health check | None |
| `/api/operators` | GET | List operators | API Key |
| `/api/operators/{id}` | GET | Get operator details | API Key |
| `/api/operators/validator` | POST | Add validator | API Key |
| `/api/validators` | GET | List validators | API Key |
| `/api/validators/{id}` | GET | Get validator details | API Key |
| `/api/chain/info` | GET | Chain information | API Key |
| `/api/chain/epochs` | GET | Epoch data | API Key |

### Authentication

API endpoints require the `BACKEND_API_KEY` header:

```bash
curl -H "Authorization: Bearer your_api_key" \
     https://your-api-domain.com/api/operators
```

## 🤖 Discord Commands

### Operator Commands

Available to all verified validators:

| Command | Purpose | Parameters |
|---------|---------|------------|
| `/register` | Register as validator operator | `ethereum_address`, `discord_handle` |
| `/add-validator` | Add validator to monitoring | `validator_address` |
| `/my-stats` | View personal validator statistics | None |
| `/is-ready` | Check validator readiness | None |
| `/chain-info` | Get current chain information | None |
| `/help` | Show available commands | None |

### Moderator Commands

Available to users with moderator roles:

| Command | Purpose | Parameters |
|---------|---------|------------|
| `/mod-add-validator` | Add validator for any operator | `operator_id`, `validator_address` |
| `/mod-approve-operator` | Approve pending operator | `operator_id` |
| `/mod-list-operators` | List all operators | `status` (optional) |
| `/mod-validator-stats` | Get validator statistics | `validator_address` |

### Command Examples

```bash
# Register as a validator operator
/register ethereum_address:0x1234... discord_handle:@myhandle

# Add a validator
/add-validator validator_address:0xabcd...

# Check your statistics
/my-stats

# Get chain information
/chain-info
```

## 🔧 Configuration Reference

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_TOKEN` | Discord bot token | `MTMzMDg2ODk1NTI5...` |
| `BOT_CLIENT_ID` | Discord client ID | `1329079356785688616` |
| `GUILD_ID` | Discord server ID | `1144692727120937080` |
| `ETHEREUM_HOST` | Ethereum node URL | `https://sepolia.infura.io/v3/...` |
| `BACKEND_API_KEY` | API authentication key | `secure_random_key` |

#### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3000` | API server port |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `LOG_PRETTY_PRINT` | `false` | Human-readable logs |
| `API_DESIRED_COUNT` | `1` | ECS task count |

### Database Schema

#### Node Operators Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique operator ID |
| `ethereumAddress` | String | Ethereum wallet address |
| `discordHandle` | String | Discord username |
| `createdAt` | Timestamp | Registration time |

#### Validators Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique validator ID |
| `operatorId` | String | Owner operator ID |
| `address` | String | Validator address |
| `isActive` | Boolean | Activity status |
| `lastSeen` | Timestamp | Last activity |

## 🔍 Troubleshooting

### Common Issues

#### Discord Bot Not Responding

1. **Check Bot Status**:
```bash
# Check ECS service
aws ecs describe-services --cluster sparta --services sparta-discord

# Check logs
aws logs tail /ecs/sparta-bot --follow
```

2. **Verify Permissions**:
   - Bot has necessary Discord permissions
   - Bot is added to the correct server
   - Commands are registered properly

#### API Errors

1. **Check Service Health**:
```bash
curl https://your-api-domain.com/health
```

2. **Review Logs**:
```bash
aws logs get-log-events --log-group-name /ecs/sparta-api
```

#### Database Connection Issues

1. **Verify DynamoDB Access**:
```bash
aws dynamodb list-tables --region your-region
```

2. **Check IAM Permissions**:
   - ECS task role has DynamoDB permissions
   - Security groups allow connections

#### Blockchain Connectivity

1. **Test Ethereum Connection**:
```bash
curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     $ETHEREUM_HOST
```

2. **Verify Contract Addresses**:
   - Staking contract is deployed
   - Contract ABI matches expectations

### Performance Issues

#### High Memory Usage

- Increase ECS task memory allocation
- Review application memory leaks
- Optimize database queries

#### High CPU Usage

- Scale ECS tasks horizontally
- Optimize Discord command processing
- Review background job frequency

#### Database Throttling

- Increase DynamoDB capacity
- Implement connection pooling
- Add application-level caching

### Debugging Tools

#### Local Development

```bash
# Enable debug logging
LOG_LEVEL=debug bun run dev

# Monitor database operations
LOCAL_DYNAMO_DB=true bun run dev

# Test API endpoints
curl -H "Authorization: Bearer $BACKEND_API_KEY" \
     http://localhost:3000/api/operators
```

#### Production Monitoring

```bash
# Stream CloudWatch logs
aws logs tail /ecs/sparta-bot --follow --region eu-west-2

# Check ECS task health
aws ecs describe-tasks --cluster sparta --tasks task-id

# Monitor Lambda functions
aws lambda get-function --function-name sparta-validator-monitor
```

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: Follow TypeScript best practices with ESLint
2. **Testing**: Write tests for new features and bug fixes
3. **Documentation**: Update README and inline documentation
4. **Type Safety**: Maintain strict TypeScript configuration

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request with description

### Release Process

1. Update version numbers in package.json files
2. Tag release in Git
3. Deploy to staging for testing
4. Deploy to production
5. Update deployment documentation

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🆘 Support

For questions, issues, or contributions:

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/your-org/sparta/issues)
- **Discord**: Join the Aztec validator community
- **Documentation**: Comprehensive guides in `/docs` directory

---

*Built with ❤️ for the Aztec blockchain community*
