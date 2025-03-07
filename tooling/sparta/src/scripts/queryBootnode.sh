#! /bin/bash

docker run aztecprotocol/aztec:1dc66419e0e7e1543bee081471701f90192fa33e get-node-info --node-url {$1}:8080 --json
