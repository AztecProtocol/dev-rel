#!/bin/bash

# Function to print an error message and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# Check for the required Aztec version parameter
if [ $# -ne 1 ]; then
    error_exit "Usage: $0 aztec-packages-vX.Y.Z"
fi

aztec_version_parameter="$1"
aztec_version=${aztec_version_parameter#*v}

# Check if tmp directory exists
if [ ! -d "tmp" ]; then
    error_exit "tmp directory not found. Did update_aztec_contracts.sh run successfully?"
fi

# Directory containing the aztec-packages TypeScript files
source_ts_dir="tmp/yarn-project/end-to-end/src"

# Base directories
target_dirs=("../../tutorials" "../../workshops")

# Process each base directory
for target_dir in "${target_dirs[@]}"; do
    echo "Updating all  e2e_*.ts files in dir: $target_dir"

    # Loop through each e2e_*.ts file found in the target directory
    find "$target_dir" -name "e2e_*.ts" | while read -r e2e_file; do
        echo "Processing $e2e_file..."

        # Extract the filename
        filename=$(basename "$e2e_file")

        # Find the equivalent .ts file in the aztec-packages directory
        source_file=$(find "$source_ts_dir" -name "$filename")

        if [ -z "$source_file" ]; then
            echo "No equivalent file found for $filename in aztec-packages directory."
            continue
        fi

        echo "Found source file: $source_file"

        # Copy the content from the source file to the target file
        cp "$source_file" "$e2e_file"
        echo "Updated $e2e_file"

    done
done

# Update all @aztec packages in package.json files in the project
find . -name "package.json" | while read -r package_file; do
    echo "Updating $package_file with Aztec version $aztec_version..."
    sed -i "s/@aztec\/[a-zA-Z0-9_-]*\": \"^[0-9.]*\"/@aztec\/\1\": \"^$aztec_version\"/g" "$package_file"
done

# Token Bridge e2e
# Grab delay function from aztec-packages and replace
source_delay_function_file="$source_ts_dir/fixtures/utils.ts"
target_delay_function_file="../../tutorials/token-bridge-e2e/packages/src/test/fixtures/utils.ts"

# Copying delay function
echo "Copying delay function from $source_delay_function_file to $target_delay_function_file..."
grep -Pzo "(?s)export function delay\(.*?\}\n" "$source_delay_function_file" > "$target_delay_function_file"

# Copy cross_chain_test_harness.ts
source_cross_chain_file="$source_ts_dir/shared/cross_chain_test_harness.ts"
target_cross_chain_file="../../tutorials/token-bridge-e2e/packages/src/test/shared/cross_chain_test_harness.ts"

echo "Copying cross_chain_test_harness from $source_cross_chain_file to $target_cross_chain_file..."
cp "$source_cross_chain_file" "$target_cross_chain_file"
echo "Token bridge e2e processed."
