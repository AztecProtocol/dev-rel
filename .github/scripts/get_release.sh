#!/usr/bin/env bash
# 🛡️ PORTABILITY: Use 'env bash' for broader OS compatibility.

set -e # Exit immediately if a command exits with a non-zero status.

# 1. DEPENDENCY CHECK
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed." >&2
    exit 1
fi

# 2. AUTH HEADER SETUP
if [ -n "$GITHUB_TOKEN" ]; then
    AUTH_HEADER="Authorization: token $GITHUB_TOKEN"
else
    # Warning: Without a token, rate limits are very low (60 req/hr).
    echo "Warning: No GITHUB_TOKEN set. Using unauthenticated request." >&2
    AUTH_HEADER="User-Agent: Aztec-Script" # GitHub requires a User-Agent
fi

# 3. FETCH DATA
# 🚀 OPTIMIZATION: 
# - '?per_page=100': Increases search window to ensuring we find the tag even if other components released recently.
# - '-f': Fail silently on server errors (404, 500) so we catch it in the 'if'.
# - '-s': Silent mode (no progress bar).
API_URL="https://api.github.com/repos/AztecProtocol/aztec-packages/releases?per_page=100"

if ! RELEASES_JSON=$(curl -s -f -H "$AUTH_HEADER" "$API_URL"); then
    echo "Error: Failed to fetch releases from GitHub API." >&2
    exit 1
fi

# 4. PARSE AND FILTER
# Logic: 
# - Iterate through array
# - Select items where tag_name contains 'aztec-packages'
# - Extract tag_name
# - Take the first one (latest due to API sort order)
LATEST_TAG=$(echo "$RELEASES_JSON" | jq -r '.[] | select(.tag_name | contains("aztec-packages")) | .tag_name' | head -1)

# 5. VALIDATION
if [ -z "$LATEST_TAG" ]; then
    echo "Error: No tag matching 'aztec-packages' found in the last 100 releases." >&2
    exit 1
fi

echo "$LATEST_TAG"
