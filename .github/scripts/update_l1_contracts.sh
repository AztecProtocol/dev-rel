#!/usr/bin/env bash

# 🛡️ STRICT MODE: Exit on error, undefined vars, and pipe failures.
set -euo pipefail

# Function to print error and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# 🍏 MACOS COMPATIBILITY: Wrapper for sed -i
sedi() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# Check if tmp directory exists
# 🛡️ PATH SAFETY: Ensure we look for tmp relative to current execution context safely
if [ ! -d "tmp" ]; then
    error_exit "tmp directory not found. Did update_aztec_contracts.sh run successfully?"
fi

# Directory containing the aztec-packages L1 contracts
source_contracts_dir="tmp/l1-contracts/test"

if [ ! -d "$source_contracts_dir" ]; then
    error_exit "Source directory '$source_contracts_dir' does not exist inside tmp."
fi

# Base directories
target_dirs=("./tutorials" "./workshops")

# Process each base directory
for target_dir in "${target_dirs[@]}"; do
    # Skip if directory doesn't exist to avoid find errors
    if [ ! -d "$target_dir" ]; then
        echo "Warning: Target directory '$target_dir' not found, skipping."
        continue
    fi

    echo "Processing directory: $target_dir"

    # 🛡️ SAFETY: Use -print0 to handle filenames with spaces correctly
    find "$target_dir" -name "*.sol" -print0 | while IFS= read -r -d '' target_file; do
        # Extract the filename
        filename=$(basename "$target_file")

        # Find the equivalent .sol file in the aztec-packages directory
        # 🛡️ SAFETY: 'head -n 1' ensures we only get one file if duplicates exist, preventing script crash.
        source_file=$(find "$source_contracts_dir" -name "$filename" -print -quit)

        if [ -z "$source_file" ]; then
            echo "  [SKIP] No source found for: $filename"
            continue
        fi

        echo "  [UPDATE] $filename"
        # echo "       Source: $source_file"

        # Copy the content from the source file to the target file
        if cp "$source_file" "$target_file"; then
            # Replace ../../ with @aztec/l1-contracts/ and remove 'docs' comments
            # 🛡️ REGEX: Using portable sedi wrapper
            sedi -e 's|\.\./\.\./|@aztec/l1-contracts/|g' -e '/[ \t]*\/\/ docs:.*/d' "$target_file"
            # echo "       -> Imports fixed & docs removed."
        else
            echo "  [ERROR] Failed to copy $source_file"
            exit 1
        fi
    done
done

echo "✔ All .sol files processed."
