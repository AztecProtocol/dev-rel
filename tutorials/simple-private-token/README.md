# Tutorial: Write and interact with your first Aztec.nr contract

_> 💡 This branch is primarily aimed towards developers coming from Ethereum and utilizes the sandbox. There is a limited assumed knowledge of zk, but there are pieces throughout to encourage zk devs. We will be adding other branches for different knowledge levels._

In this tutorial, we will write, compile, deploy, and interact with an Aztec.nr smart contract. You do not need any experience with Aztec or Noir, but it will help to have some basic blockchain knowledge. You’ll learn how to:

1. Set up a new Aztec.nr project with Nargo
2. Write a private transferrable token contract
3. Program privacy into Aztec smart contracts in general
4. Deploy your contract using Aztec.js
5. Interact with your contract using Aztec.js

Before following this tutorial, please make sure you have [installed the sandbox.](https://sandbox.aztec.network)

## Contract

This tutorial is divided into two parts - the contract and the node app. If you’d like to skip to the Aztec.js part, you can find the full smart contract [here](./contracts/private_token_contract/src/main.nr).

### Starting a project

Run the [sandbox](https://aztec-docs-dev.netlify.app/dev_docs/getting_started/sandbox) using either Docker or npm.

Docker

```rust
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```

npm

```rust
npx @aztec/aztec-sandbox
```

#### Requirements

You will need to install nargo, the Noir build too. if you are familiar with Rust, this is similar to cargo.

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v aztec
```

This command ensures that you are on the `aztec` version of noirup, which is what we need to compile and deploy aztec.nr smart contracts.

While not strictly required, consider installing the [Noir Language Support VS Code extension](https://marketplace.visualstudio.com/items?itemName=noir-lang.vscode-noir) to get Noir contract syntax highlighting.

Check the [Dev Tools section](https://github.com/noir-lang/awesome-noir#dev-tools) of the awesome-noir repo for language support for additional editors (Vim, emacs, tree-sitter, etc).

#### Create a project

Create a new directory called `aztec-private-token`

```bash
mkdir aztec-private-token
```

then create a `contracts` folder inside where our aztec.nr contract will live:

```bash
cd aztec-private-token
mkdir contracts
```

Inside `contracts`, create a new Noir project using nargo:

```bash
cd contracts
nargo new private_token_contract
```

Your file structure should look like this:

```bash
aztec-private-token
|-contracts
| |--private_token_contract
| |  |--src
| |  |  |--main.nr
| |  |Nargo.toml
```

The file `main.nr` will soon turn into our smart contract!

Go to the generated file `Nargo.toml` and replace it with this:

```bash
[package]
name = "private_token"
type = "contract"
authors = [""]
compiler_version = "0.11.1"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/aztec-noir" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/value-note"}
easy_private_state = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/easy-private-state"}
```

This defines the type as `contract` and adds the dependencies we need to create a private token smart contract.

## Writing a smart contract

In this section, we will learn how to write a private transferrable token smart contract.

In this contract, the identity of the sender and recipient, the amount being transferred, and the initial supply of tokens are kept private and only disclosed to the parties involved.

### Step 1: Define the functions needed

Go to `main.nr` and replace the code with this contract and functions:

```rust
contract PrivateToken {
    #[aztec(private)]
    fn constructor(initial_supply: Field, owner: Field) {}

    #[aztec(private)]
    fn mint(amount: Field, owner: Field) {}

    #[aztec(private)]
    fn transfer(amount: Field, recipient: Field) {}

    unconstrained fn get_balance(owner: Field) -> Field {
        0
    }
}
```

This code defines a contract called `PrivateToken` with four functions that we will implement later - a `constructor` which is called when the contract is deployed, `mint`, `transfer`, and `get_balance`.

We have annotated the functions with `#[aztec(private)]` which are ABI macros so the compiler understands it will handle private inputs.

The `get_balance` function doesn’t need this as it will only be reading from the chain, not updating state, similar to a `view` function in Solidity. This is what `unconstrained` means.

### Step 2. Privately store contract state

In this step, we will initiate a `Storage` struct to store balances in a private way. Write this within your contract at the top.

```rust
   use dep::std::option::Option;
    use dep::value_note::{
        balance_utils,
        utils::{increment, decrement},
        value_note::{VALUE_NOTE_LEN, ValueNote, ValueNoteMethods},
    };
    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        state_vars::{map::Map, set::Set},
    };

    struct Storage {
        // maps an aztec address to its balance
        balances: Map<Set<ValueNote, VALUE_NOTE_LEN>>,
    }
// rest of the functions

```

**What are these new dependencies?**

`context::{PrivateContext, Context}`
Context gives us access to the environment information such as `msg.sender`. We are also importing `PrivateContext` to access necessary information for our private functions. We’ll be using it in the next step.

`state_vars::{map::Map, set::Set}`

Map is a state variable that functions like a dictionary, relating Fields to other state variables. A Set is specifically used for managing multiple notes.

`value_note::{VALUE_NOTE_LEN, ValueNote, ValueNoteMethods}`

Notes are fundamental to how Aztec manages privacy. A note is a privacy-preserving representation of an amount of tokens associated with an address, while encrypting the amount and owner. In this contract, we are using the `value_note` [library](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/aztec-nr/value-note).

From the `value_note` library we are using `ValueNote` which is a type of note interface for storing a single Field, eg a balance, `VALUE_NOTE_LEN` which is a global const of 3 acting as the length of a ValueNote, and `ValueNoteMethods` which is a collection of functions for operating on a ValueNote.

Now we’ve got that out of the way, let’s create an init method for our Storage struct between the `struct Storage` definition and the contract methods:

```rust
// Imports and Storage struct definition up here

impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                balances: Map::new(
                    context,
                    1, // Storage slot
                    |context, slot| {
                        Set::new(context, slot, ValueNoteMethods)
                    },
                ),
            }
        }
    }

// Contract functions down here
```

This `init` method is creating and initializing a `Storage` instance. This instance includes a `Map` named `balances`. Each entry in this `Map` represents an account's balance.

When the `Map` is created, it is populated with a `Set` of `ValueNote` for each slot (representing each address). The `Set` contains all `ValueNote` entries (private balances) corresponding to that address. The `init` method uses the given `Context` to correctly set up this initial state.

### Step 3: Keeping balances private

Now we’ve got a mechanism for storing our private state, we can start using it to ensure the privacy of balances.

Let’s create a `constructor` method to run on deployment that assigns an initial supply of tokens to a specified owner. In the constructor we created in the first step, write this:

```rust
    #[aztec(private)]
    fn constructor(
        initial_supply: Field,
        owner: Field
    )  {
        let storage = Storage::init(Context::private(&mut context)); // Initialize Storage struct with the private context
        let owner_balance = storage.balances.at(owner);  // Access the Set of the owner's ValueNotes from the "balances" Map
        if (initial_supply != 0) {
            increment(owner_balance, initial_supply, owner); // Increase owner's supply by specified amount
        }
    }
```

Here, we are creating a private context and using this to initialize the storage struct. The function then accesses the encrypted balance of the owner from storage. Lastly, it assigns the initial supply of tokens to the owner, maintaining the privacy of the operation by working on encrypted data.

### Step 4: Transferring and minting privately

Now let’s implement the `transfer` and `mint` function we defined in the first step. In the `mint` function, write this:

```rust
    #[aztec(private)]
    fn mint(
        amount: Field,
        owner: Field
    )  {
        let storage = Storage::init(Context::private(&mut context));
        let owner_balance = storage.balances.at(owner);
        increment(owner_balance, amount, owner);
    }
```

In the mint function, we first transform our context into a private one and initialize our storage as we did in the constructor. We then access the owner's `ValueNote` Set from the `balances` Map. We then use this to increment the `owner`'s balance using the `balance_utils::increment` function to add the minted amount to the owner's balance privately.

Note that there is no access control on this function. Anyone can call the `mint` function to increment anyone else's balances. We will review access control in a future tutorial.

The `transfer` function is similar. In the `transfer` function, put this:

```rust
    #[aztec(private)]
    fn transfer(
        amount: Field,
        recipient: Field,
    )  {
        let storage = Storage::init(Context::private(&mut context));
        let sender = context.msg_sender(); // set sender as msg.sender()

        let sender_balance = storage.balances.at(sender); // get the sender's balance
        decrement(sender_balance, amount, sender); // decrement sender balance by amount

        // Creates new note for the recipient.
        let recipient_balance = storage.balances.at(recipient); // get recipient's balance
        increment(recipient_balance, amount, recipient); // increment recipient balance by amount
    }
```

Here, we create a private context, initialize the storage, and set the sender as `msg.sender()`. We then get the sender’s balance, decrement it by the amount specified, and increment the recipient’s balance in the same way.

### Step 5: Preventing double spending

Because our token transfers are private, the network can't directly verify if a note was spent or not, which could lead to double-spending. To solve this, we use a nullifier - a unique identifier generated from each spent note and its owner.

Add a new function into your contract as shown below:

```rust
unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {
    let note_header = NoteHeader { contract_address, nonce, storage_slot };
    note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
}
```

Here, we're computing both the note hash and the nullifier. The nullifier computation uses Aztec’s `compute_note_hash_and_nullifier` function, which takes our `ValueNoteMethods` and details about the note's attributes (e.g. contract address, nonce, storage slot, and pre-image).

Aztec will use these nullifiers to track and prevent double-spending, ensuring the integrity of private transactions without us having to explicitly program a check within smart contract functions.

### Step 6: Getting an encrypted balance

The last thing we need to implement which will help us test our contract or read balances from other contracts is the `get_balance` function. in the `get_balance` we defined in the first step, write this:

```rust
// Computes note hash and nullifier.
// Note 1: Needs to be defined by every contract producing logs.
// Note 2: Having it in all the contracts gives us the ability to compute the note hash and nullifier differently for different kind of notes.
unconstrained fn get_balance(owner: Field) -> Field {
    let context = Context::none();
    let storage = Storage::init(context);
    let owner_notes = storage.balances.at(owner);
    balance_utils::get_balance(owner_notes)
}
```

In this function, we initialize our storage with no context as it is not required. This allows us to fetch data from storage without a transaction. We retrieve a reference to the `owner`'s `ValueNote` Set from the `balances` Map. The `get_balance` function then operates on the owner's `ValueNote` Set. This processes the set of `ValueNote`s to yield a private and encrypted balance that only the private key owner can decrypt.

## Deploying a contract using Aztec.js

This tutorial assumes you have followed along to create a private token smart contract. If you skipped that part, you can get the smart contract here.

### Setting up a project

You will need to run the sandbox if it is not running already. You can use either Docker or npm.

Docker

```rust
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```

npm

```rust
npx @aztec/aztec-sandbox
```

### Requirements

- [Aztec Sandbox](https://sandbox.aztec.network/)
- Node ≥ 18
- Aztec CLI

```rust
yarn global add @aztec/cli
```

or

```rust
npm install -g @aztec/cli
```

### Set up a project

Go the root directory we created in [this section](#create-a-project) and create a new `yarn` project. `npm` works too.

```bash
yarn init
```

Leave the following questions as default.

Add `typescript` and Aztec libraries to your project:

```bash
yarn add typescript @types/node --dev @aztec/aztec.js @aztec/noir-contracts
```

and create a `src` directory:

```bash
mkdir src
```

Now in your `package.json` add a `scripts` section and set `"type":"module"`:

```
"type": "module",
"scripts": {
    "build": "yarn clean && tsc -b",
    "build:dev": "tsc -b --watch",
    "clean": "rm -rf ./dest tsconfig.tsbuildinfo",
    "start": "yarn build && export DEBUG='private-token' && node ./dest/src/index.js"
  },
```

Create a `tsconfig.json` in the root and use your favourite config settings. Here’s an example:

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

Now we’re set up!

### Generate typescript classes

The Aztec CLI has a compiler that allows you to autogenerate type-safe typescript classes for your contracts.

Generate one for our private token smart contract like this (assuming you are in the project root directory)

```bash
aztec-cli compile --typescript ./src ./contracts/private_token_contract
```

This will create `privateToken.ts` in your root `./src` and `target` in your `./private_token_contract/src` dir.

### Deploy

Now we’re ready for some code. We’re going to create a deploy script.

Create an `index.ts` file in `src` and paste this:

```tsx
import { Fr } from "@aztec/foundation/fields";
import { createAztecRpcClient } from "@aztec/aztec.js";
import { PrivateTokenContract } from "./PrivateToken.js"; // the TS file we generated from our smart contract

const SANDBOX_URL = process.env["SANDBOX_URL"] || "http://localhost:8080";
```

We will use Fr to create a `salt` and `createAztecRpcClient` to communicate with the sandbox.

Create a new async function and set up the RPC client.

```tsx
const deployContract = async () => {
  const rpc = await createAztecRpcClient(SANDBOX_URL);
  const accounts = await rpc.getAccounts();
  console.log(`Accounts: ${await console.log(accounts)}`);
};
```

This creates an RPC client for us to communicate with the sandbox and gets all existing accounts.

At the end of the file put this so this function is called when we run:

```tsx
deployContract();
```

Run `yarn start` and you should see something like this:

```
[
  CompleteAddress {
    address: AztecAddress {
      buffer: <Buffer 0c 8a 66 73 d7 67 6c c8 0a ae be 7f a7 50 4c f5 1d aa 90 ba 90 68 61 bf ad 70 a5 8a 98 bf 5a 7d>
    },
    publicKey: Point { x: [Fr], y: [Fr], kind: 'point' },
    partialAddress: Fr {
      value: 12842361594093371645447963466236087693839286598884465802477690293367168135161n
    }
  },
  CompleteAddress {
    address: AztecAddress {
      buffer: <Buffer 22 6f 80 87 79 2b ef f8 d5 00 9e b9 4e 65 d2 a4 a5 05 b7 0b af 4a 9f 28 d3 3c 8d 62 0b 0b a9 72>
    },
    publicKey: Point { x: [Fr], y: [Fr], kind: 'point' },
    partialAddress: Fr {
      value: 10947199389209909230221260693433096752267924726152037777149078870207166136489n
    }
  },
  CompleteAddress {
    address: AztecAddress {
      buffer: <Buffer 0e 1f 60 e8 56 6e 2c 6d 32 37 8b dc ad b7 c6 36 96 e8 53 28 1b e7 98 c1 07 26 6b 8c 3a 88 ea 9b>
    },
    publicKey: Point { x: [Fr], y: [Fr], kind: 'point' },
    partialAddress: Fr {
      value: 21716832730255068406413142798013580191572666867321964226631189064226445259586n
    }
  }
]
```

Now under our logging statement let’s get the data we need to deploy:

```tsx
const deployerWallet = accounts[0];
const salt = Fr.random();
```

We will use the first account in our array to deploy the contract and a salt to help us compute where the contract will be deployed (like CREATE2).

Next we will create and send a deployment transaction object:

```tsx
const tx = PrivateTokenContract.deploy(rpc, 100n, deployerWallet.address).send({
  contractAddressSalt: salt,
});
console.log(`Tx sent with hash ${await tx.getTxHash()}`);
```

`deploy` takes 3 arguments:

- rpc: instance of an RPC client (RPC object)
- noteValue: initial token supply (BigInt)
- deployerAddress: Aztec account address that will deploy the contract (string)

We are also passing `contractAddressSalt` in options, with our salt we generated from `Fr`.

Run `yarn start` and you’ll see something like this:

```
Tx sent with hash 1a8fc8a8807fd9504869426f9470ca8fc7bc89aa9db53d201ea9765866be46a1
```

The deploy transaction has been sent - now let’s make sure it is successfully mined.

`tx` has a function `getReceipt` which contains status, block information, tx hash, and contract address. Put this under your transaction:

```tsx
const receipt = await tx.getReceipt();
console.log(`Status: ${receipt.status}`);
console.log(`Contract address: ${receipt.contractAddress}`);
```

If we run this, we will see:

```
Status: pending
Contract address: undefined
```

so we have to wait until after the transaction is mined.

Add this line on top of your receipt code:

```tsx
await tx.isMined({ interval: 0.1 });
```

The `interval` lets us check if the transaction is mined every 0.1 seconds.

Your entire file should look like this:

```tsx
import { Fr } from "@aztec/foundation/fields";
import { createAztecRpcClient } from "@aztec/aztec.js";
import { PrivateTokenContract } from "./PrivateToken.js";

const SANDBOX_URL = process.env["SANDBOX_URL"] || "http://localhost:8080";

const deployContract = async () => {
  const rpc = await createAztecRpcClient(SANDBOX_URL);
  const accounts = await rpc.getAccounts();
  await console.log(accounts);

  const deployerWallet = accounts[0];
  const salt = Fr.random();

  const tx = PrivateTokenContract.deploy(rpc, 100n, deployerWallet.address).send({ contractAddressSalt: salt });
  console.log(`Tx sent with hash ${await tx.getTxHash()}`);

  await tx.isMined({ interval: 0.1 });
  const receiptAfterMined = await tx.getReceipt();
  console.log(`Status: ${receiptAfterMined.status}`);
  console.log(`Contract address: ${receiptAfterMined.contractAddress}`);
};
deployContract();
```

Run `yarn start` and you’ll see something like this:

```
Status: mined
Contract address: 0x05eaa897fb321983b60715f37809f36aec7f6061eaf671574b6c0303bbdd9687
```

Congratulations! You’ve just written and deployed an Aztec.nr smart contract on the sandbox! 🚀

To learn more about Aztec.js, including how to interact with your new deployed contract, check out the docs [here](https://aztec-docs-dev.netlify.app/dev_docs/getting_started/sandbox).
