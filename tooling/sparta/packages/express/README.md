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

# Passport Configuration
PASSPORT_SCORER_ID=your-passport-scorer-id
PASSPORT_API_KEY=your-passport-api-key

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# DynamoDB Configuration
SESSION_TABLE_NAME=sparta-sessions
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
