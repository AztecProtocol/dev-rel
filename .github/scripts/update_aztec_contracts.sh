#!/usr/bin/env bash

# 🛡️ PORTABILITY: Use 'env bash' for broader compatibility.
set -e # Exit immediately if a command exits with a non-zero status.

# Function to print error and exit
error_exit() {
    echo "Error: $1" 1>&2
    exit 1
}

# 🧹 CLEANUP: Ensure temp dir is removed on exit (success or failure)
cleanup() {
    if [ -n "$tmp_dir" ] && [ -d "$tmp_dir" ]; then
        echo "Cleaning up temporary directory..."
        rm -rf "$tmp_dir"
    fi
}
trap cleanup EXIT

# 🍏 MACOS COMPATIBILITY: Wrapper for sed -i
sedi() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# Check arguments
version_tag="$1"
if [ -z "$version_tag" ]; then
    error_exit "No version tag provided."
fi

# Base dirs to search through
base_dirs=("./tutorials" "./workshops")

# Aztec-packages repo
repo_url="https://github.com/AztecProtocol/aztec-packages.git"
contracts_path="yarn-project/noir-contracts/contracts"

# Create a secure temp directory
tmp_dir=$(mktemp -d)
echo "Created temp dir: $tmp_dir"

# Clone aztec-packages 
echo "Cloning repository..."
if ! git clone --depth 1 --branch "$version_tag" "$repo_url" "$tmp_dir" 2>/dev/null; then
    # Fallback: if tag isn't a branch, clone full and checkout
    echo "Tag/Branch not found directly, cloning full repo..."
    git clone "$repo_url" "$tmp_dir"
    (cd "$tmp_dir" && git checkout "$version_tag")
fi

echo "Checked out version: $version_tag"

# Loop through each base directory
for base_dir in "${base_dirs[@]}"; do
    if [ ! -d "$base_dir" ]; then continue; fi
    
    echo "Processing directory: $base_dir"

    # Find Nargo.toml files safely (handle spaces in paths)
    find "$base_dir" -name "Nargo.toml" -print0 | while IFS= read -r -d '' nargo_file_path; do
        echo "------------------------------------------------"
        echo "Processing file: $nargo_file_path"

        project_dir=$(dirname "$nargo_file_path")
        
        # 🛡️ ROBUST PARSING: Extract 'name' using awk/sed instead of fragile grep/cut
        # Look for name = "Value" allowing for spaces
        name_value=$(grep "^name[[:space:]]*=" "$nargo_file_path" | sed -E 's/^name[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/')

        if [ -z "$name_value" ]; then
            echo "Warning: 'name' field not found in $nargo_file_path. Skipping."
            continue
        fi

        echo "Project Name: $name_value"
        target_contract_path="$tmp_dir/$contracts_path/$name_value"

        if [ -d "$target_contract_path" ]; then
            echo "✔ Match found in aztec-packages: $name_value"

            # --- 1. UPDATE NARGO.TOML ---
            # We read the file into a variable or temp file to avoid "read while write" loop issues.
            
            # Create a temp file for the new Nargo.toml content
            temp_nargo=$(mktemp)
            
            while IFS= read -r line; do
                # Check if line contains a path dependency
                if [[ "$line" =~ path[[:space:]]*=[[:space:]]*\"([^\"]+)\" ]]; then
                    relative_path="${BASH_REMATCH[1]}"
                    new_line="$line" # Default to keeping the line if no match below

                    if [[ "$relative_path" == *"../../aztec-nr"* ]]; then
                        # Converting aztec-nr path to git dependency
                        new_path="git=\"https://github.com/AztecProtocol/aztec-packages/\", tag=\"$version_tag\", directory=\"yarn-project/aztec-nr/aztec\""
                        # ⚠️ LOGIC: Replacing the entire key-value pair with 'aztec = { ... }'
                        # This assumes you want to rename the dependency key to 'aztec'
                        new_line=$(echo "$line" | sed -E "s|path[[:space:]]*=.*|aztec = { $new_path }|")
                        echo "  -> Updated dependency: aztec-nr"
                    
                    elif [[ "$relative_path" == *"..//"* ]] || [[ "$relative_path" == *"../"* ]]; then
                        # Converting local contract path to git dependency
                        dir_name=$(basename "$relative_path")
                        new_path="git=\"https://github.com/AztecProtocol/aztec-packages/\", tag=\"$version_tag\", directory=\"noir-projects/noir-contracts/contracts/$dir_name\""
                        # Keeping the original dependency name/structure but replacing the path
                        # NOTE: The original script replaced EVERYTHING with 'aztec = ...'. 
                        # If that was intended, keep it. If not, use the line below:
                        # new_line=$(echo "$line" | sed -E "s|path[[:space:]]*=.*|$new_path|")
                        
                        # Sticking to original logic: replace definition with aztec = { ... }
                        # Use a generic substitution for the dependency line
                        new_line="aztec = { $new_path }"
                        echo "  -> Updated dependency: $dir_name"
                    fi
                    
                    echo "$new_line" >> "$temp_nargo"
                else
                    echo "$line" >> "$temp_nargo"
                fi
            done < "$nargo_file_path"

            mv "$temp_nargo" "$nargo_file_path"

            # --- 2. COPY SOURCE FILES ---
            copy_location="$project_dir/src"
            mkdir -p "$copy_location"

            echo "  -> Copying source files..."
            if cp -r "$target_contract_path/src/"* "$copy_location/"; then
                echo "  -> Source copied successfully."
            else
                echo "  ❌ Failed to copy source files."
            fi

            # --- 3. REMOVE DOC COMMENTS ---
            # Using portable sed wrapper
            find "$copy_location" -type f -name "*.nr" | while read -r file; do
                # Remove lines starting with optional whitespace followed by // docs:
                sedi '/^[[:space:]]*\/\/ docs:.*/d' "$file"
            done
            echo "  -> Doc comments removed."

        else
            echo "Warning: Directory '$name_value' not found in aztec-packages clone."
        fi
    done
done

echo "Done."
