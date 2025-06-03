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