#!/bin/bash
# Script to build the Lambda package for validator monitoring

# Exit on errors
set -e

# Get paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDA_PATH="$PROJECT_ROOT/packages/scheduler/lambda-package.zip"

# Build the Lambda package silently
echo "Building Lambda package..." >&2
(cd "$PROJECT_ROOT/packages/scheduler" && bun run build > /dev/null 2>&1)

# Calculate the base64-encoded SHA256 hash of the package
HASH=$(openssl dgst -binary -sha256 "$LAMBDA_PATH" | openssl base64)

echo "Lambda package built successfully at $LAMBDA_PATH" >&2
echo "Hash: $HASH" >&2

# Output the hash as JSON (and ONLY the hash as JSON)
echo "{\"hash\":\"$HASH\"}" 