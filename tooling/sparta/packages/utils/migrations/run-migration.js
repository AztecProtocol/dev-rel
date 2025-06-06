#!/usr/bin/env node

/**
 * Migration runner script for @sparta/utils
 * 
 * This script runs migration scripts based on the provided argument.
 * 
 * Usage:

 *   npm run migrate 07_populate_operators_validators_field
 * 
 * Environment variables:
 *   DRY_RUN=true - Run in dry mode (no database writes)
 *   TEST_MODE=true - Process only one item (for testing)
 *   NODE_OPERATORS_TABLE_NAME - Override default table name
 *   VALIDATORS_TABLE_NAME - Override default table name
 *   VALIDATOR_HISTORY_TABLE_NAME - Override default validator history table name
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrationName = process.argv[2];

if (!migrationName) {
  console.error('❌ Migration name is required');
  console.log('\nUsage: npm run migrate <migration_name>');
  console.log('\nAvailable migrations:');
  console.log('  07_populate_operators_validators_field - Populate validators field on operators from validators table');
  console.log('  08_simplify_validators_field - Simplify validators array, remove unused fields, and update validator nodeOperatorId to use operator address');
  console.log('\n⚠️  Note: Migration 05 requires the validator history table to be recreated with numeric slot type.');
  console.log('   Run "terraform destroy -target=aws_dynamodb_table.sparta_validator_history" first,');
  console.log('   then "terraform apply" to recreate the table with the correct schema.');
  process.exit(1);
}

const migrationFile = join(__dirname, `${migrationName}.js`);

if (!existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`);
  // Check if the user tried to run the old name for the renamed script
  if (migrationName === "03_remove_discord_username_attribute") {
    console.error("ℹ️  Note: '03_remove_discord_username_attribute' has been renamed to '04_remove_discord_username_attribute'.");
  }
  process.exit(1);
}

console.log(`🚀 Running migration: ${migrationName}`);
console.log(`📁 Migration file: ${migrationFile}`);

try {
  // Import and run the migration
  const migration = await import(migrationFile);
  console.log(`✅ Migration ${migrationName} completed successfully`);
} catch (error) {
  console.error(`❌ Migration ${migrationName} failed:`, error.message);
  process.exit(1);
} 