# Sparta Migration System

This directory contains the migration system for the Sparta project, which manages database schema changes and data migrations for DynamoDB tables.

## Overview

The migration system is part of the `@sparta/utils` package and provides:

- **Automated backups** before running migrations
- **Dry-run capability** to preview changes
- **Comprehensive reporting** of migration results
- **Error handling** and rollback guidance

## Quick Start

```bash
# Navigate to the utils package
cd tooling/sparta/packages/utils

# Run a test migration to verify the system works
npm run migrate test-migration

# Run a migration in dry-run mode (no changes made)
DRY_RUN=true npm run migrate 03_add_wasslashed_field

# Run a migration for real
npm run migrate 03_add_wasslashed_field

# Create backups only (without running migration)
npm run backup
```

## Environment Variables

Set these environment variables in your `.env` file or shell:

```bash
# Required for API access
BACKEND_API_KEY=your-api-key-here
API_URL=http://localhost:3000

# Table names (optional, defaults shown)
NODE_OPERATORS_TABLE_NAME=sparta-node-operators-dev
VALIDATORS_TABLE_NAME=sparta-validators-dev

# AWS configuration
AWS_REGION=us-east-1

# Migration options
DRY_RUN=true          # Run in dry mode (no database writes)
IS_LOCAL=false        # Set to true for local DynamoDB
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Available Migrations

### `test-migration`
A simple test migration that verifies the migration system is working correctly. Safe to run multiple times.

### `00_update_node_operators`
Updates the node operators table structure. Creates necessary indexes and updates schema.

### `01_migrate_validators`
Creates the validators table with proper schema and indexes. Separates validators from the node operators table.

### `02_populate_validators`
Populates the validators table with data from the API. Matches validators with operators by wallet address.

### `03_add_wasslashed_field`
**Main migration for slashing detection:**

- Fetches all validators from the database
- Gets the current validator set from the blockchain
- Identifies validators that were slashed (in DB but not on chain)
- Removes slashed validators from the database
- Updates corresponding node operators (sets `isApproved=false`)
- Generates a comprehensive report

**What it does:**
1. Scans all validators in the database
2. Fetches current validator set from blockchain via API
3. Compares the two lists to find slashed validators
4. For each slashed validator:
   - Removes the validator from the validators table
   - Updates the operator's `isApproved` status to `false`
   - Records the action in the report

**Report includes:**
- Total validators in database vs. on chain
- List of slashed validators and their operators
- Affected operators with their details
- Any errors encountered during the process

**Environment Variables**:
* `DRY_RUN=true`: Perform a dry run without actual database writes.
* `TEST_MODE=true`: Process only a small batch of items (useful for testing the script logic).
* `VALIDATORS_TABLE_NAME`: Override the default validators table name.
* `NODE_OPERATORS_TABLE_NAME`: Override the default node operators table name.

### `04_remove_discord_username_attribute`

Removes the `discordUsername` attribute from all items in the `node-operators` table. This is intended to be run after infrastructure changes (Terraform) have removed the attribute definition and the `DiscordUsernameIndex` GSI from the table schema.

**Environment Variables**:
* `DRY_RUN=true`: Perform a dry run without actual database writes (logs actions that would be taken).
* `TEST_MODE=true`: Process only a small batch of items (e.g., 5 items) for testing.
* `NODE_OPERATORS_TABLE_NAME`: (Required) The name of the node operators table to process.
* `AWS_REGION`: (Optional) The AWS region for the DynamoDB table (defaults to `eu-west-2`).
* `DYNAMODB_ENDPOINT`: (Optional) For use with a local DynamoDB instance (e.g., `http://localhost:8000`).
* `LOCAL_DYNAMO_DB="true"`: (Optional) Signals usage of a local DynamoDB instance, often in conjunction with `DYNAMODB_ENDPOINT`.

### `05_populate_validator_history`

Populates the validator history table with historical attestation data from the L2 RPC endpoint:

- Fetches validator stats from the L2 RPC endpoint
- Processes each validator's history entries sequentially
- Writes history entries to the validator history table in batches
- Checks for existing entries to avoid duplicates
- Generates a comprehensive report

**Environment Variables**:
* `DRY_RUN=true`: Perform a dry run without actual database writes.
* `TEST_MODE=true`: Process only first 2 validators for testing.
* `VALIDATOR_HISTORY_TABLE_NAME`: (Required) The validator history table name.
* `AZTEC_RPC_URL`: (Optional) L2 RPC endpoint URL (defaults to `http://35.230.8.105:8080`).
* `AWS_REGION`: (Optional) The AWS region for the DynamoDB table (defaults to `eu-west-2`).

### `06_add_wallet_to_operators`

**IMPORTANT: This migration changes the primary key structure of the node operators table from `discordId` to `address`.**

Migrates the node operators table to use wallet addresses as the primary key:

- Fetches all validators from the API endpoint `/api/validator/validators`
- Gets all existing operators from the database
- Groups validators by their operator ID to determine the best address for each operator
- For each operator, selects the validator with the highest `lastAttestationSlot`
- Creates new operator records with `address` as the primary key
- Deletes old operator records that used `discordId` as primary key
- Operators without validators cannot be migrated (no address available)
- Generates a detailed migration report

**What it does:**
1. Fetches all validators from the API and existing operators from the database
2. Determines the best wallet address for each operator based on their validators
3. Creates new operator records using `address` as the primary key
4. Deletes the old records that used `discordId` as primary key
5. Maintains `discordId` as a regular attribute (indexed via GSI)
6. Provides comprehensive reporting of migrations, skips, and errors

**Prerequisites:**
- Terraform must be applied first to create the new table structure with GSI
- Application code must be deployed with updated repositories
- Ensure proper backups exist before running

**Environment Variables**:
* `DRY_RUN=true`: Perform a dry run without actual database writes.
* `TEST_MODE=true`: Process only first 5 operators for testing.
* `NODE_OPERATORS_TABLE_NAME`: (Required) The name of the node operators table.
* `API_URL`: (Optional) The API base URL (defaults to `http://localhost:3000`).
* `BACKEND_API_KEY`: (Required) API key for authentication.
* `AWS_REGION`: (Optional) The AWS region for the DynamoDB table (defaults to `eu-west-2`).
* `DYNAMODB_ENDPOINT`: (Optional) For use with a local DynamoDB instance.
* `LOCAL_DYNAMO_DB="true"`: (Optional) Signals usage of a local DynamoDB instance.

**Migration Order:**
1. Deploy Terraform changes to add GSI and change primary key structure
2. Deploy application code with updated repository methods
3. Run this migration to transform existing data
4. Verify all operators have been migrated successfully

## Backup System

The migration system automatically creates backups before running any migration:

```bash
# Backup naming format
migration-backup-YYYYMMDD-HHMMSS-{table-name}

# Example backup names
migration-backup-20241201-143022-sparta-node-operators-dev
migration-backup-20241201-143022-sparta-validators-dev
```

### Restoring from Backup

If you need to restore from a backup:

```bash
# List available backups
aws dynamodb list-backups --table-name sparta-node-operators-dev

# Restore from backup (replace with actual backup ARN)
aws dynamodb restore-table-from-backup \
  --target-table-name sparta-node-operators-dev-restored \
  --backup-arn arn:aws:dynamodb:region:account:table/sparta-node-operators-dev/backup/01234567890123-abcdef12
```

## Dry Run Mode

Always test migrations in dry-run mode first:

```bash
# Dry run - shows what would happen without making changes
DRY_RUN=true npm run migrate 03_add_wasslashed_field
```

Dry run mode will:
- Show all the changes that would be made
- Generate the same report as a real run
- Not modify any database records
- Help you understand the impact before executing

## Error Handling

The migration system includes comprehensive error handling:

- **Validation errors**: Invalid environment variables or missing dependencies
- **API errors**: Network issues or authentication problems
- **Database errors**: Connection issues or permission problems
- **Data errors**: Inconsistent or corrupted data

All errors are logged and included in the migration report.

## Adding New Migrations

To create a new migration:

1. Create a new file: `migrations/04_your_migration_name.js`
2. Follow the existing pattern:
   ```javascript
   import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
   import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
   import dotenv from "dotenv";
   
   dotenv.config();
   
   async function runMigration() {
     try {
       // Your migration logic here
       console.log('✅ Migration completed successfully!');
       return { success: true };
     } catch (error) {
       console.error('❌ Migration failed:', error.message);
       return { success: false, error: error.message };
     }
   }
   
   runMigration()
     .then(result => {
       if (!result.success) {
         process.exit(1);
       }
     })
     .catch(error => {
       console.error("Unhandled error:", error);
       process.exit(1);
     });
   ```

3. Update `run-migration.js` to include your migration in the help text
4. Test with dry-run mode first
5. Document the migration in this README

## Best Practices

1. **Always backup first**: The system does this automatically
2. **Test in dry-run mode**: Verify the migration logic before executing
3. **Monitor the process**: Watch logs and reports carefully
4. **Validate results**: Check that the migration achieved the intended outcome
5. **Document changes**: Update this README and any relevant documentation

## Troubleshooting

### Common Issues

**Migration fails with "Table not found"**
- Check your table names in environment variables
- Verify AWS credentials and region
- Ensure tables exist in the target environment

**API errors during migration**
- Verify `BACKEND_API_KEY` is correct
- Check `API_URL` points to the right environment
- Ensure the API is running and accessible

**Permission errors**
- Verify AWS credentials have DynamoDB access
- Check IAM permissions for backup creation
- Ensure API key has required permissions

**Dry run shows unexpected results**
- Review the migration logic
- Check data consistency in source tables
- Verify API responses match expected format

### Getting Help

1. Check the migration logs for detailed error messages
2. Review the generated report for insights
3. Test with the `test-migration` to verify system setup
4. Contact the development team with specific error details

## Security Notes

- Never commit API keys or credentials to version control
- Use environment variables for all sensitive configuration
- Limit migration access to authorized personnel only
- Review migration reports for any sensitive data exposure

## Performance Considerations

- Migrations use pagination to handle large datasets
- Batch operations are used where possible
- Progress is logged for long-running operations
- Consider running during low-traffic periods for production 