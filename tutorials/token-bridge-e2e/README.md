# Token Bridge e2e

This project contains the entire flow of a cross-chain token using portals. You can find the tutorial [here](https://docs.aztec.network/dev_docs/tutorials/token_portal/main).

## Setup

It is not recommended to skip the tutorial, but if you must:

## Dependencies
1. Node >= v18

2. Docker

3. A running updated Aztec sandbox

```bash
bash -i <(curl -s install.aztec.network) 
aztec-sandbox
```

With this installation you will get the other dependencies needed for Aztec.

4. Hardhat

### Installing

Run this in the root dir, ie `token_bridge_e2e`. This will install packages required for `src` and `l1-contracts`.

```bash
cd packages/src && yarn && cd ..
cd l1-contracts && yarn && cd ..
```
### Compiling

You need to compile L1 and L2 contracts before you can test them. Run this in the root dir.

```bash
cd packages/aztec-contracts/token_bridge && aztec-nargo compile
aztec-cli codegen target -o ../../src/test/fixtures --ts
cd ../../l1-contracts && npx hardhat compile
```

### Running tests
With your sandbox running, in the `src` dir run

```bash
DEBUG='aztec:e2e_uniswap' yarn test
```
