#!/bin/bash

# Function to print an error message and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# Check if tmp directory exists
if [ ! -d "tmp" ]; then
    error_exit "tmp directory not found. Did update_aztec_contracts.sh run successfully?"
fi

# Directory containing the aztec-packages L1 contracts
source_contracts_dir="tmp/l1-contracts/test"

# Base directories
target_dirs=("./tutorials" "./workshops")

# Process each base directory
for target_dir in "${target_dirs[@]}"; do
    echo "Processing directory: $target_dir"

    # Loop through each .sol file found in the target directory
    find "$target_dir" -name "*.sol" | while read -r target_file; do
        echo "Processing $target_file..."

        # Extract the filename
        filename=$(basename "$target_file")

        # Find the equivalent .sol file in the aztec-packages directory
        source_file=$(find "$source_contracts_dir" -name "$filename")

        if [ -z "$source_file" ]; then
            echo "No equivalent file found for $filename in aztec-packages directory."
            continue
        fi

        echo "Found source file: $source_file"

        # Copy the content from the source file to the target file
        cp "$source_file" "$target_file"
        echo "Updated $target_file"

        # Replace ../../ with @aztec/l1-contracts/ and remove 'docs' comments
        sed -i -e 's|\.\./\.\./|@aztec/l1-contracts/|g' -e '/[ \t]*\/\/ docs:.*/d' "$target_file"
        echo "Updated import paths and removed docs comments from $target_file"
    done
done

echo "All .sol files processed."
