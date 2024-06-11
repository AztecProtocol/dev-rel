#! /bin/bash
set -euo pipefail
mkdir -p ./src/artifacts

contracts=(account-EcdsaP256Account)

for contract in "${contracts[@]}"; do
  cp "./contracts/account/target/$contract.json" ./src/artifacts/${contract#*-}.json
done