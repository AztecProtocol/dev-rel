# Sparta Express API

This directory contains the source code for the Sparta Express API, which provides endpoints for Human Passport verification.

## Project Structure

The project is organized into several directories:

- **src/**: Main source code
  - **routes/**: API route implementations
  - **services/**: Core business logic services
  - **swagger.ts**: Swagger API documentation configuration

## Key Components

### Routes

The `routes/` directory contains the API route implementations:

- **passport-routes.ts**: Endpoints for Human Passport verification

### Services

The `services/` directory contains the core business logic:

- **passport-service.ts**: Integrates with Human Passport API for verification
- **discord-service.ts**: Communicates with the Discord bot for role management

## Key Functionality

### Human Passport Verification

The API provides endpoints for verifying users with Human Passport:

1. Create a verification session
2. Connect a wallet
3. Verify the wallet signature
4. Check verification status

### Discord Role Management

The API now includes a service for managing Discord roles without direct dependency on the Discord.js client. Instead, it communicates with the Discord bot through a REST API:

1. **DiscordService**: Provides methods to assign roles based on verification scores
   - Communicates with the Discord bot's API server to request role assignments
   - Handles role assignments based on user scores from Human Passport

## API Endpoints

### Passport Verification

- **POST /api/create-session**: Create a new verification session
- **GET /api/session/:sessionId**: Validate and get session info
- **POST /api/verify**: Verify a wallet signature
- **GET /api/status/discord/:discordUserId**: Check verification status by Discord ID

## Configuration

The API requires several environment variables to be set in `.env.local`:

```
# API Server Configuration
API_PORT=3000

# WebApp Configuration
WEBAPP_PORT=3001
WEBAPP_HOST=http://localhost

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# DynamoDB Configuration
LOCAL_DYNAMO_DB=true
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
```

## Running the API

To run the API in development mode:

```bash
bun run dev
```

To build and run in production:

```bash
bun run build
bun run start
```

## Validator Migration Guide

### Background
The express service has been updated to use a new data structure for validators. Previously, validators were stored as an array within each NodeOperator object. The new design creates a separate "validators" table with a one-to-many relationship to node operators, which offers better query capabilities and data integrity.

### Migration Process
To migrate the system from the old structure to the new one, follow these steps:

1. Deploy the updated code to your environment
2. Run the migration script from the Sparta scripts directory:

```bash
# Run all migrations in sequence
cd tooling/sparta/scripts
./run-migrations.sh

# Or run just the validator migration
node migrations/01_migrate_validators.js
```

The complete migration logic is now contained in the scripts directory at `tooling/sparta/scripts/migrations/01_migrate_validators.js`, making it easier to run and maintain.

### What the Migration Does
1. Creates a new DynamoDB table (`sparta-validators-dev` by default) with appropriate indexes
2. Reads all node operators from the existing table
3. For each node operator with validators, creates new entries in the validators table
4. Maintains all existing relationships between validators and operators

### Post-Migration Verification
After running the migration, you can verify the success by:

1. Checking the API endpoints that return validators
2. Viewing logs from the migration process
3. Directly querying the validators table in DynamoDB

### Environment Variables
The migration process uses the following environment variables:

- `VALIDATORS_TABLE_NAME`: Name of the new validators table (default: `sparta-validators-dev`)
- `NODE_OPERATORS_TABLE_NAME`: Name of the existing node operators table (default: `sparta-node-operators-dev`)
- `AWS_REGION`: AWS region for DynamoDB (default: `us-east-1`)
- `IS_LOCAL`: Whether to use local DynamoDB (default: true)
- `DYNAMODB_LOCAL_ENDPOINT`: Endpoint for local DynamoDB (default: http://localhost:8000)

### Reverting (If Needed)
If you need to revert the migration:

1. Roll back to the previous code version
2. Delete the validators table (note: this will lose any new validators added after migration)

### Data Schema Changes
The new Validator schema includes:
- `validatorAddress`: Primary key (string)
- `nodeOperatorId`: Foreign key to node operators (string)
- `createdAt`: Timestamp of creation (number)
- `updatedAt`: Timestamp of last update (number)

The NodeOperator schema has been updated to remove the `validators` array field.
