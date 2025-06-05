#!/usr/bin/env node

/**
 * Migration runner script for @sparta/utils
 * 
 * This script runs migration scripts based on the provided argument.
 * 
 * Usage:
 *   npm run migrate 00_update_node_operators
 *   npm run migrate 01_migrate_validators
 *   npm run migrate 02_populate_validators
 *   npm run migrate 03_add_wasslashed_field
 *   npm run migrate 04_remove_discord_username_attribute
 *   npm run migrate 05_populate_validator_history
 *   npm run migrate 06_add_wallet_to_operators
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
  console.log('  test-migration              - Test migration to verify system works');
  console.log('  00_update_node_operators    - Update node operators table structure');
  console.log('  01_migrate_validators       - Create validators table');
  console.log('  02_populate_validators      - Populate validators from API');
  console.log('  03_add_wasslashed_field     - Add wasSlashed field and check for slashed validators');
  console.log('  04_remove_discord_username_attribute - Remove discordUsername from node_operators table');
  console.log('  05_populate_validator_history - Populate validator history table from L2 RPC (requires numeric slots)');
  console.log('  06_add_wallet_to_operators  - Add wallet addresses to operators based on their validators');
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