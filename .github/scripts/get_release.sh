#!/bin/bash

# Check if GITHUB_TOKEN is set
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
else
    AUTH_HEADER=""
fi

# Fetch the release data from GitHub API
RELEASES_JSON=$(curl -s -H "$AUTH_HEADER" "https://api.github.com/repos/AztecProtocol/aztec-packages/releases")

# Use jq to parse JSON and get the latest tag
LATEST_TAG=$(echo "$RELEASES_JSON" | jq -r '.[] | select(.tag_name | contains("aztec-packages")) | .tag_name' | head -1)

echo "$LATEST_TAG" # Output the latest tag
