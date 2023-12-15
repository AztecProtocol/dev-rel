#!/bin/bash

copy_to_file_path="./packages/aztec-contracts/token_bridge"
# change this with new releases
version="aztec-packages-v0.16.9"
nargo_file_path="$copy_to_file_path/Nargo.toml"

repo_url="https://github.com/AztecProtocol/aztec-packages.git"
contracts_path="yarn-project/noir-contracts/src/contracts"

# Check if the file exists
if [ ! -f "$nargo_file_path" ]; then
    echo "File not found: $nargo_file_path"
    exit 1
fi

# Extract the value of the 'name' field
name_value=$(grep "^name\s*=" "$nargo_file_path" | sed 's/name\s*=\s*"\(.*\)"/\1/')

# Check if name_value is not empty
if [ -z "$name_value" ]; then
    echo "Name field not found or empty in the TOML file."
else
    echo "The value of the 'name' field is: $name_value"
fi

# Clone the repository into a tmp folder
git clone $repo_url tmp
cd tmp && git checkout $version && cd ..

# Check if clone was successful
if [ $? -eq 0 ]; then

    # Check if the directory exists
    if [ -d "tmp/$contracts_path/$name_value" ]; then
        echo "Directory found: $name_value"
        cp -r tmp/$contracts_path/$name_value/src/ $copy_to_file_path/
        rm -rf tmp
        echo "Copied the contracts to $copy_to_file_path"
        # You can add additional commands here to handle the directory

        # Remove docs comments from the files
        find "$copy_to_file_path/src" -type f -name "*.nr" | while read file; do
            # Remove lines starting with '// docs:'
            sed -i '/[ \t]*\/\/ docs:.*/d' "$file"

            echo "Comments removed from $file"
        done
    else
        echo "Directory not found: $name_value"
        rm -rf tmp
    fi
else
    echo "Failed to clone the repository"
fi
