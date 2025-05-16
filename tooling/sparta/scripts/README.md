# Sparta Scripts

This directory contains utility scripts for managing and maintaining the Sparta project.

## Available Scripts

### Migrations

The `migrations/` directory contains database migration scripts that should be run in sequence (based on their numeric prefix).

- **00_update_node_operators.js**: Adds `isApproved` field and Discord usernames to node operators
- **01_migrate_validators.js**: Migrates validators from being stored as an array in node operators to a separate validators table

### Running Migrations

To run all migrations in sequence:

```bash
./run-migrations.sh
```

This script will automatically run each migration in the correct order. If any migration fails, the process will stop.

To run a specific migration script individually:

```bash
node migrations/XX_script_name.js
```

### Other Utility Scripts

- **start-local-dynamodb.sh**: Starts a local DynamoDB instance for development and testing
- **test-dynamodb.js**: Tests DynamoDB connectivity and basic operations
- **build_push_get_digest.sh**: Builds and pushes Docker images
- **getStats.js**: Retrieves and displays statistics
- **swagger.js**: Generates Swagger/OpenAPI documentation

## Environment Variables

The scripts use the following environment variables:

- `IS_LOCAL`: Set to "true" to use a local DynamoDB instance (default: true)
- `DYNAMODB_LOCAL_ENDPOINT`: URL of the local DynamoDB instance (default: http://localhost:8000)
- `AWS_REGION`: AWS region to use for AWS services
- `BOT_TOKEN`: Discord bot token (required for migrations that interact with Discord)
- `GUILD_ID`: Discord guild/server ID (required for migrations that interact with Discord)
- `NODE_OPERATORS_TABLE_NAME`: DynamoDB table name for node operators (default: sparta-node-operators-dev)
- `VALIDATORS_TABLE_NAME`: DynamoDB table name for validators (default: sparta-validators-dev)

## Adding New Migrations

When adding a new migration:

1. Create a new file in the `migrations/` directory with a sequential prefix (e.g., `02_migration_name.js`)
2. Add documentation for the migration in this README
3. Test the migration thoroughly before running it in production

## Migration Structure Best Practices

- Always handle errors gracefully
- Log each step of the migration process
- Provide a clear summary at the end of the migration
- Make migrations idempotent when possible (can be run multiple times without issues)
- Include a way to verify the migration was successful 