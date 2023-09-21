# Workshop ZkSummit London 2023
## Installing sandbox
You will need to install the sandbox to follow this workshop.
### Using Docker
```bash
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```
### Using npm
```bash
npx @aztec/aztec-sandbox
```

## Installing Nargo
nargo is our build tool similar to Rust's cargo 
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
noirup -v 0.11.1-aztec.0
```

## Start a project
We will create a yarn project and contracts dir with our nargo project.
```bash
mkdir aztec-counter && cd aztec-counter && mkdir contracts && cd contracts
```
Then create a new Noir project with Nargo
```bash
nargo new counter
```

## Nargo.toml
```
[package]
name = "private_contract"
authors = ["you! ;) "]
compiler_version = "current_noir_version"
type = "contract"

[dependencies]
# To install the aztec framework (required to create aztec contracts).
aztec = { git = "https://github.com/AztecProtocol/aztec-nr", tag = "master" , directory = "aztec" }

# Optional libraries
easy_private_state = { git = "https://github.com/AztecProtocol/aztec-nr", tag = "master" , directory = "easy-private-state" }
value_note = { git = "https://github.com/AztecProtocol/aztec-nr", tag = "master" , directory = "value-note" }
```
## Full main.nr

```rust
contract PrivateCounter {
    use dep::aztec::{
        context::{Context},
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        state_vars::map::Map,
    };
    use dep::value_note::{
            balance_utils,
            value_note::{
                ValueNoteMethods,
                VALUE_NOTE_LEN,
            },
    };
    use dep::easy_private_state::easy_private_state::EasyPrivateUint;
        
    struct Storage {
        counts: Map<EasyPrivateUint>,
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                counts: Map::new(
                    context,
                    1,
                    |context, slot| {
                        EasyPrivateUint::new(context, slot)
                    },
                ),
            }
        }
    }

    #[aztec(private)]
    fn constructor(initial_count: u120, owner: Field) {
        let storage = Storage::init(Context::private(&mut context));
        let counts = storage.counts;
        counts.at(owner).add(initial_count, owner);
    }

    #[aztec(private)]
      fn increment(owner: Field)  {
        let storage = Storage::init(Context::private(&mut context));
        let counts = storage.counts;
        counts.at(owner).add(1, owner);
    }

    unconstrained fn get_counter(owner: Field) -> Field {
        let storage = Storage::init(Context::none());
        let counts = storage.counts;
        balance_utils::get_balance(counts.at(owner).set)
    }

     unconstrained fn compute_note_hash_and_nullifier(
        contract_address: Field,
        nonce: Field,
        storage_slot: Field,
        preimage: [Field; VALUE_NOTE_LEN],
    ) -> [Field; 4] {
        let note_header = NoteHeader { contract_address, nonce, storage_slot };
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
    }
}
```
To understand more about exactly how this is working, follow our [token standard tutorial](https://docs.aztec.network/dev_docs/getting_started/token_contract_tutorial)

## Compiling and testing
* Compile (this will create a ./target dir with JSON files)
`aztec-cli compile .` 
* Generate a private key
`aztec-cli generate-private-key`
* Create an account
`aztec-cli create-account --private-key <PRIVATE_KEY>`
* Deploy
`aztec-cli deploy <PATH_TO_JSON_ABI>`
* Call get_counter
`aztec-cli call get_counter --contract-address <CONTRACT_ADDRESS> --contract-abi <PATH_TO_CONTRACT_ABI> --args <INITIAL_COUNTER> <ACCOUNT>`
* Call increment
`aztec-cli send increment --contract-address <CONTRACT_ADDRESS> --contract-abi <PATH_TO_CONTRACT_ABI> --args <ACCOUNT> --private-key <PRIVATE_KEY>`

# Typescript project
Go to root dir of project and run `yarn init`

## Libraries
```bash
yarn add typescript @types/node --dev @aztec/aztec.js @aztec/noir-contracts
```
## Add this to package.json 
```json
"type": "module",
"scripts": {
    "build": "yarn clean && tsc -b",
    "build:dev": "tsc -b --watch",
    "clean": "rm -rf ./dest tsconfig.tsbuildinfo",
    "start": "yarn build && export DEBUG='private-token' && node ./dest/src/index.js"
  },
```

## tsconfig.json
This is just an example
```json
{
    "compilerOptions": {
      "rootDir": "./",
      "outDir": "dest",
      "target": "es2020",
      "lib": ["dom", "esnext", "es2017.object"],
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "strict": true,
      "declaration": true,
      "allowSyntheticDefaultImports": true,
      "esModuleInterop": true,
      "downlevelIteration": true,
      "inlineSourceMap": true,
      "declarationMap": true,
      "importHelpers": true,
      "resolveJsonModule": true,
      "composite": true,
      "skipLibCheck": true
    },
    "include": ["src/**/*", "contracts/**/*.json"],
    "exclude": ["node_modules", "**/*.spec.ts", "contracts/**/*.ts"],
    "references": []
}
```

## Full index.ts
```typescript
import { Fr } from '@aztec/foundation/fields';
import { createAztecRpcClient } from '@aztec/aztec.js';
import { PrivateCounterContract } from './PrivateCounter.js';

const SANDBOX_URL = process.env['SANDBOX_URL'] || 'http://localhost:8080';

const deployContract = async () => {
    const rpc = await createAztecRpcClient(SANDBOX_URL);
    const accounts = await rpc.getRegisteredAccounts();
    await console.log(accounts);

    const deployerWallet = accounts[0];
    const salt = Fr.random();

    const tx = PrivateCounterContract.deploy(rpc, 100n, deployerWallet.address).send({ contractAddressSalt: salt });
    console.log(`Tx sent with hash ${await tx.getTxHash()}`);

    await tx.isMined({ interval: 0.1 });
    const receiptAfterMined = await tx.getReceipt();
    console.log(`Status: ${receiptAfterMined.status}`);
    console.log(`Contract address: ${receiptAfterMined.contractAddress}`);
};
deployContract()
```
Run `yarn start` and this will deploy your private counter to the sandbox