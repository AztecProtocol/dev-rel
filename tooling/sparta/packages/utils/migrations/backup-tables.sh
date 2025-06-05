#!/bin/bash

# Backup script for DynamoDB tables before running migrations
# This script creates backups of both node operators and validators tables

set -e  # Exit on any error

# Configuration
NODE_OPERATORS_TABLE_NAME=${NODE_OPERATORS_TABLE_NAME:-"sparta-node-op-dev"}
NETWORK_STATS_TABLE_NAME=${NETWORK_STATS_TABLE_NAME:-"sparta-network-stats-dev"}
VALIDATOR_HISTORY_TABLE_NAME=${VALIDATOR_HISTORY_TABLE_NAME:-"sparta-validator-history-dev"}
VALIDATORS_TABLE_NAME=${VALIDATORS_TABLE_NAME:-"sparta-validators-dev"}
BACKUP_PREFIX="migration-backup-$(date +%Y%m%d-%H%M%S)"

echo "====== DynamoDB Tables Backup ======"
echo "Node Operators Table: $NODE_OPERATORS_TABLE_NAME"
echo "Network Stats Table: $NETWORK_STATS_TABLE_NAME"
echo "Validator History Table: $VALIDATOR_HISTORY_TABLE_NAME"
echo "Validators Table: $VALIDATORS_TABLE_NAME"
echo "Backup Prefix: $BACKUP_PREFIX"
echo "====================================="

# Function to create backup
create_backup() {
    local table_name=$1
    local backup_name="${BACKUP_PREFIX}-${table_name}"
    
    echo "🔄 Creating backup for table: $table_name"
    echo "   Backup name: $backup_name"
    
    # Create backup using AWS CLI
    aws dynamodb create-backup \
        --table-name "$table_name" \
        --backup-name "$backup_name" \
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup created successfully for $table_name"
    else
        echo "❌ Failed to create backup for $table_name"
        exit 1
    fi
}

# Function to check if table exists
table_exists() {
    local table_name=$1
    aws dynamodb describe-table --table-name "$table_name" >/dev/null 2>&1
    return $?
}

echo ""
echo "🔍 Checking if tables exist..."

# Check and backup node operators table
if table_exists "$NODE_OPERATORS_TABLE_NAME"; then
    echo "✅ Node operators table exists"
    create_backup "$NODE_OPERATORS_TABLE_NAME"
else
    echo "⚠️  Node operators table does not exist: $NODE_OPERATORS_TABLE_NAME"
fi

# Check and backup network stats table

if table_exists "$NETWORK_STATS_TABLE_NAME"; then
    echo "✅ Network stats table exists"
    create_backup "$NETWORK_STATS_TABLE_NAME"
else
    echo "⚠️  Network stats table does not exist: $NETWORK_STATS_TABLE_NAME"
fi

# Check and backup validators table
if table_exists "$VALIDATORS_TABLE_NAME"; then
    echo "✅ Validators table exists"
    create_backup "$VALIDATORS_TABLE_NAME"
else
    echo "⚠️  Validators table does not exist: $VALIDATORS_TABLE_NAME"
fi

# Check and backup validator history table

if table_exists "$VALIDATOR_HISTORY_TABLE_NAME"; then
    echo "✅ Validator history table exists"
    create_backup "$VALIDATOR_HISTORY_TABLE_NAME"
else
    echo "⚠️  Validator history table does not exist: $VALIDATOR_HISTORY_TABLE_NAME"
fi

echo ""
echo "🎉 Backup process completed!"
echo ""
echo "To restore from backup if needed:"
echo "aws dynamodb restore-table-from-backup --target-table-name <table-name> --backup-arn <backup-arn>"
echo ""
echo "To list backups:"
echo "aws dynamodb list-backups --table-name <table-name>" 