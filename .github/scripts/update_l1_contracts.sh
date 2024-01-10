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

# Base directory to search for .sol files
base_dirs=("./tutorials" "./workshops")


# Directory containing the L1 contracts
l1_contracts_dir="tmp/l1-contracts/test"  # Adjust to the correct subdirectory path in tmp

# Process each base directory
for base_dir in "${base_dirs[@]}"; do
    echo "Processing directory: $base_dir"

    # Loop through each .sol file found in the base directory
    find "$base_dir" -name "*.sol" | while read -r sol_file; do
        echo "Processing $sol_file..."

        # Extract the filename without the path
        filename=$(basename "$sol_file")

        # Find the equivalent .sol file in the l1-contracts directory
        l1_equivalent=$(find "$l1_contracts_dir" -name "$filename")

        if [ -z "$l1_equivalent" ]; then
            echo "No equivalent file found for $filename in L1 contracts directory."
            continue
        fi

        echo "Found equivalent L1 contract: $l1_equivalent"

        # Replace the code in the L1 equivalent with the code from the found .sol file
        cp "$sol_file" "$l1_equivalent"
        echo "Replaced $sol_file"

        # Remove comments from the L1 contract file
        sed -i '/^[ \t]*\/\//d' "$l1_equivalent"  # Removes single-line comments
        sed -i '/\/\*/,/\*\//d' "$l1_equivalent" # Removes block comments
        echo "Removed comments from $sol_file"
    done
done

echo "All .sol files processed."