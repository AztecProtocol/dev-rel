
This folder provides a simple example using: Aztec contracts in Noir, code+libs to use them in typescript, and commands to build, deploy, and run the code on Aztec.

It uses a fixed version of the tooling that is guaranteed to work. Although it won't be updated each week to the latest version, it will be periodically updated so as to not drift far behind.

## Using this repo

- Install the sandbox tools directly via curl [info]()
- Once the latest is installed, use `aztec-up` to specify the version of tooling to use (0.42.0)
  -  `aztec-up 0.42.0`
- Check the corresponding version of `aztec-nargo` that comes with the sandbox v0.42.0 is `0.30.0`
  - `aztec-nargo -V`
- Build: `pnmp compile`
- Run sandbox: `pnpm run:sandbox` (should be able to run node + separate pxe ())
- Run ts code: `node main`


## How this repo was set up

## Contracts
- Create project dir (eg `accounts`) and `pnpm init` inside
- `mkdir contracts && cd contracts`
- Install Aztec tools directly (via curl)
- Create new contract: `aztec-nargo new --contract account`, and enter contract dir `cd account`
- Compile the sample contract: `aztec-nargo compile`
  - Creates `target` folder with `.json` artifacts
- Copy `Nargo.toml` and `src` from [ecdsa example v0.42.0](https://github.com/AztecProtocol/aztec-packages/tree/aztec-packages-v0.42.0/noir-projects/noir-contracts/contracts/ecdsa_account_contract)
- Nargo.toml - pin compiler version, `compiler_version = "=0.30.0"`
- Set dep version to `tag="aztec-packages-v0.42.0"`

## Typescript
- `pnpm i -D typescript @types/node prettier eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser`
- Create desired tsconfig and prettier files
- Add @aztec modules pinned to sandbox version
  - `pnpm i -D @aztec/aztec.js@0.42.0 @aztec/accounts@0.42.0 @aztec/noir-contracts.js@0.42.0 @aztec/circuits.js@0.42.0 @aztec/circuit-types@0.42.0`
- Add compile scripts to package.json

## General
- Add run scripts to package.json

