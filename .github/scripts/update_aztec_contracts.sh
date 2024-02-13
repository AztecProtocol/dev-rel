#!/bin/bash

# Function to print an error message and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# Accept version tag as an argument
version_tag="$1"
if [ -z "$version_tag" ]; then
    error_exit "No version tag provided."
fi

# Base dirs to search through
base_dirs=("./tutorials" "./workshops")

# Aztec-packages repo
repo_url="https://github.com/AztecProtocol/aztec-packages.git"
contracts_path="yarn-project/noir-contracts/contracts"

if [ "$GITHUB_ACTIONS" == "true" ]; then
    tmp_dir="$GITHUB_WORKSPACE/tmp"
else
    tmp_dir="tmp"
fi

# Clone aztec-packages 
if ! git clone "$repo_url" "$tmp_dir"; then
    error_exit "Failed to clone the repository."
fi

if ! cd "$tmp_dir" || ! git checkout "$version_tag"; then
    error_exit "Failed to checkout the specified version."
fi
cd ..

# Loop through each base directory
for base_dir in "${base_dirs[@]}"; do
    echo "Processing $base_dir..."

    # Find dirs containing Nargo.toml and loop through them
    while IFS= read -r nargo_file_path; do
        echo "Processing file: $nargo_file_path"

        # Check if Nargo.toml exists
        if [ ! -f "$nargo_file_path" ]; then
            echo "Warning: File not found: $nargo_file_path"
            continue
        fi

        # Extract the directory path
        project_dir=$(dirname "$nargo_file_path")
        echo "Found project: $project_dir"

        # Get name
        name_value=$(grep "^name\s*=" "$nargo_file_path" | cut -d '"' -f 2 | tr -d ' ')

        # Check if name_value is not empty
        if [ -z "$name_value" ]; then
            echo "Warning: Name field not found or empty in the TOML file."
            continue
        else
            echo "The value of the 'name' field is: $name_value"
        fi

        echo "Looking for directory: $tmp_dir/$contracts_path/$name_value"

        # Check if the directory exists in the cloned aztec-packages
        if [ -d "$tmp_dir/$contracts_path/$name_value" ]; then
            echo "Directory found: $name_value"

            # Update Nargo.toml
            if [ -f "$tmp_dir/$contracts_path/$name_value/Nargo.toml" ]; then
                cp "$tmp_dir/$contracts_path/$name_value/Nargo.toml" "$project_dir/Nargo.toml"
                echo "Nargo.toml updated from the repository."
            else
                echo "Nargo.toml does not exist in $tmp_dir/$contracts_path/$name_value"
            fi

            copy_location="$project_dir/src"
            
            # Check src dir exists
            if [ ! -d "$copy_location" ]; then
                echo "Warning: 'src' directory does not exist in $project_dir, creating it now."
                mkdir -p "$copy_location"
            fi

            # Copy contracts to 'src' dir
            if ! cp -r "$tmp_dir/$contracts_path/$name_value/src/"* "$copy_location/"; then
                echo "Warning: Failed to copy files to $copy_location"
            else
                echo "Copied the contracts to $copy_location"
            fi

            # Update the tag in Nargo.toml
            nargo_file_path="$project_dir/Nargo.toml"
            if [ -f "$nargo_file_path" ]; then
                while IFS= read -r line; do
                    if [[ $line == *tag=* ]]; then
                        dependency_name=$(echo $line | grep -oP '(?<=\").+?(?=\")' | head -1)
                        sed -i "s|\($dependency_name.*tag=\"\)[^\"]*|\1$version_tag|" "$nargo_file_path"
                        echo "Updated tag for $dependency_name in Nargo.toml to $version_tag"
                    fi
                done < <(sed -n '/^\[dependencies\]/,/^$/p' "$nargo_file_path" | grep -v '^\[dependencies\]' | awk NF)
            else
                echo "Warning: Nargo.toml not found in $project_dir after update attempt."
            fi

            # Remove docs comments from the files
            find "$copy_location" -type f -name "*.nr" | while read file; do
                if ! sed -i '/[ \t]*\/\/ docs:.*/d' "$file"; then
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
