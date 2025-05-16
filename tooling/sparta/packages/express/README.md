# @sparta/api

Express API server for the Sparta project, providing RESTful endpoints for validator management and Discord integration.

## Overview

This package implements an Express-based API server that serves as the backend for the Sparta project:

- RESTful API endpoints for validator management
- OpenAPI/Swagger documentation
- Session management via DynamoDB
- Integration with Discord and Ethereum services
- CORS configuration for frontend access

## Key Endpoints

- **Validator Management**
  - `GET /api/validators` - List all validators
  - `GET /api/validators/:address` - Get validator details
  - `POST /api/validators` - Register a new validator
  - `DELETE /api/validators/:address` - Remove a validator

- **Chain Information**
  - `GET /api/info` - Get general chain information
  - `GET /api/blocks/latest` - Get latest block information
  - `GET /api/epochs/current` - Get current epoch information

- **Health Check**
  - `GET /health` - Check if the API server is running

## Configuration

Configure the API server through environment variables:

- `API_PORT`: Port to run the server on (default: 3000)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- `NODE_ENV`: Environment setting (development, production)

## Development

```bash
# Build TypeScript files
bun run build

# Run in development mode with hot reloading
bun run dev

# Run in production mode
bun run start
```

## Project Structure

```
src/
├── routes/       # API route implementations
├── services/     # Core business logic services
├── swagger.ts    # Swagger API documentation
└── index.ts      # Main entry point
```

## API Documentation

API documentation is available at `/api-docs` when the server is running. 