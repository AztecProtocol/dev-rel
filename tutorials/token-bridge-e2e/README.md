# Token Bridge Tutorial

It is recommended to follow this tutorial on the [Aztec docs](https://docs.aztec.network/dev_docs/tutorials/token_portal/main)

## Packages:
* l1-contracts - a JS Hardhat project
* aztec-contracts - a nargo project
* src - typescript test file that we can run against the sandbox

## Prerequisites
* node v18+
* docker
* Installed aztec sandbox
* Nargo

## Installation
* Run `yarn install`

## Compile L1 contracts
```sh
cd packages/l1-contracts
npx hardhat compile
```

## Compile aztec contracts
```sh
cd packages/aztec-contracts
aztec-cli compile PACKAGE_NAME
```

## Running the tests
* Run the sandbox:
```sh
cd ~/.aztec && docker-compose up
```

In a separate terminal
```sh
cd YOUR_REPO/packages/src
DEBUG='aztec:*' yarn test test/cross_chain_messaging_test.ts
```
