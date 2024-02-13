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

           # Update the path in Nargo.toml 
            nargo_file_path="$project_dir/Nargo.toml"
            if [ -f "$nargo_file_path" ]; then
                while IFS= read -r line; do
                    if [[ $line == *path* ]]; then
                        # Extract relative path
                        relative_path=$(echo $line | grep -oP '(?<=path = ").+?(?=")')
                        
                        if [[ $relative_path == ../../../aztec-nr/* ]]; then
                            new_path="{ git=\"https://github.com/AztecProtocol/aztec-packages/\", tag=\"$version_tag\", directory=\"yarn-project/aztec-nr/aztec\" }"
                        elif [[ $relative_path == ../* ]]; then
                            dir_name=$(basename "$relative_path")
                            new_path="{ git=\"https://github.com/AztecProtocol/aztec-packages/\", tag=\"$version_tag\", directory=\"noir-projects/noir-contracts/contracts/$dir_name\" }"
                        fi

                        # Replace path with new path
                        sed -i "s|path = \".*\"|$new_path|" "$nargo_file_path"
                        echo "Updated path for dependency to use git, tag, and directory."
                    fi
                done < "$nargo_file_path"
            else
                echo "Warning: Nargo.toml not found in $project_dir."
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
