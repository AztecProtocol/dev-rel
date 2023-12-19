#!/bin/bash

# Function to print an error message and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# Base directories to search through
base_dirs=("../tutorials" "../workshops")

# Repository details
repo_url="https://github.com/AztecProtocol/aztec-packages.git"
version="aztec-packages-v0.16.9"
contracts_path="yarn-project/noir-contracts/src/contracts"

# Clone the repository into a tmp folder once at the beginning
if ! git clone "$repo_url" tmp; then
    error_exit "Failed to clone the repository."
fi

if ! cd tmp || ! git checkout "$version"; then
    error_exit "Failed to checkout the specified version."
fi
cd ..

# Loop through each base directory
for base_dir in "${base_dirs[@]}"; do
    echo "Processing $base_dir..."

    # Find directories containing Nargo.toml and loop through them
    while IFS= read -r nargo_file_path; do
        # Extract the directory path
        project_dir=$(dirname "$nargo_file_path")
        echo "Found project: $project_dir"

        # Check if the Nargo.toml file exists
        if [ ! -f "$nargo_file_path" ]; then
            echo "Warning: File not found: $nargo_file_path"
            continue
        fi

        # Extract the value of the 'name' field
        name_value=$(grep "^name\s*=" "$nargo_file_path" | cut -d '"' -f 2)

        # Check if name_value is not empty
        if [ -z "$name_value" ]; then
            echo "Warning: Name field not found or empty in the TOML file."
            continue
        else
            echo "The value of the 'name' field is: $name_value"
        fi

        # Check if the directory exists in the cloned repo
        if [ -d "tmp/$contracts_path/$name_value" ]; then
            echo "Directory found: $name_value"

            # Define copy location
            copy_location="$project_dir/$name_value"
            mkdir -p "$copy_location"

            # Copy the contracts
            if ! cp -r "tmp/$contracts_path/$name_value/src/"* "$copy_location/"; then
                echo "Warning: Failed to copy files to $copy_location"
                continue
            fi

            echo "Copied the contracts to $copy_location"

            # Remove docs comments from the files
            find "$copy_location" -type f -name "*.nr" | while read file; do
                if ! sed -i '' '/[ \t]*\/\/ docs:.*/d' "$file"; then
                    echo "Warning: Failed to remove comments from $file"
                else
                    echo "Comments removed from $file"
                fi
            done
        else
            echo "Warning: Directory not found: $name_value"
        fi
    done < <(find "$base_dir" -name "Nargo.toml")
done

# Remove temporary files after processing is complete
rm -rf tmp
