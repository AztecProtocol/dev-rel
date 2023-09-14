# Token Contract Tutorial

In this tutorial we will go through writing a standard L2 native token contract
for the Aztec Network, using the Aztec.nr contract libraries. It is recommended that you go through the [Simple Private Token tutorial](../simple-private-token/README.md) before this tutorial to gain some familiarity with writing Aztec smart contracts. This tutorial builds on the basic token contract started there.

In this tutorial you will learn how to:

- Write public functions that update public state
- Write private functions that update private state
- Implement access control on public and private functions
- Handle math operations safely
- Handle different private note types

We are going to start with a blank project and fill in the code defined [here](./src/main.nr), and explain what is being added as we go.

## Requirements

You will need to install nargo, the Noir build too. if you are familiar with Rust, this is similar to cargo.

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v aztec
```

This command ensures that you are on the `aztec` version of noirup, which is what we need to compile and deploy aztec.nr smart contracts.

You should also install the [Noir Language Support extension](https://marketplace.visualstudio.com/items?itemName=noir-lang.vscode-noir) for VS Code.

Check the [Dev Tools section](https://github.com/noir-lang/awesome-noir#dev-tools) of the awesome-noir repo for language support for additional editors (Vim, emacs, tree-sitter, etc).

## Project setup

Create a new directory called `token_contract_tutorial`

```bash
mkdir token_contract_tutorial
```

inside that directory, create a `contracts` folder for the Aztec contracts.

```bash
cd token_contract_tutorial && mkdir contracts && cd contracts
```

Create a new Noir project using nargo.

```bash
nargo init --name token_contract
```

Your project should look like this:

```tree
├── contracts
│   ├── Nargo.toml
│   └── src
│       ├── main.nr
```

Add the following dependencies to your Nargo.toml file, below the package information:

```toml
[package]
name = "token_contract"
authors = [""]
compiler_version = "0.1"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/noir-libs/aztec-noir" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/noir-libs/value-note"}
safe_math = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/noir-libs/safe-math"}
```

## Contract Interface

```rust
contract Token {
    #[aztec(private)]
    fn constructor() {}

    #[aztec(public)]
    fn set_admin(new_admin: AztecAddress) {}

    #[aztec(public)]
    fn set_minter(minter: AztecAddress, approve: Field) {}

    #[aztec(public)]
    fn mint_public(to: AztecAddress, amount: Field) -> Field {}

    #[aztec(public)]
    fn mint_private(amount: Field, secret_hash: Field) -> Field {}

    #[aztec(public)]
    fn shield(from: AztecAddress, amount: Field, secret_hash: Field, nonce: Field) -> Field {}

    #[aztec(public)]
    fn transfer_public(from: AztecAddress, to: AztecAddress, amount: Field, nonce: Field) -> Field {}

    #[aztec(public)]
    fn burn_public(from: AztecAddress, amount: Field, nonce: Field) -> Field {}

    // Private functions

    #[aztec(private)]
    fn redeem_shield(to: AztecAddress, amount: Field, secret: Field) -> Field {}

    #[aztec(private)]
    fn unshield(from: AztecAddress, to: AztecAddress, amount: Field, nonce: Field) -> Field {}

    #[aztec(private)]
    fn transfer(from: AztecAddress, to: AztecAddress, amount: Field, nonce: Field) -> Field {}

    #[aztec(private)]
    fn burn(from: AztecAddress, amount: Field, nonce: Field) -> Field {}

    // Internal functions below

    // should be internal
    #[aztec(public)]
    fn _initialize(new_admin: AztecAddress) {}

    #[aztec(public)]
    internal fn _increase_public_balance(to: AztecAddress, amount: Field) {}

    #[aztec(public)]
    internal fn _reduce_total_supply(amount: Field) {}

    // Unconstrained functions (read only)

    unconstrained fn admin() -> Field {}

    unconstrained fn is_minter(minter: AztecAddress) -> bool {}

    unconstrained fn total_supply() -> Field {}

    unconstrained fn balance_of_private(owner: AztecAddress) -> Field {}

    unconstrained fn balance_of_public(owner: AztecAddress) -> Field {}

    unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {}
}
```

This specifies the interface of the `Token` contract. Go ahead and copy and paste this interface into your `main.nr` file.

Before we through the interface and implement each function, let's review the functions to get a sense of what the contract does.

There is a `constructor` function that will be executed once, when the contract is deployed, similar to the constructor function on Ethereum. This is marked private, so the function logic will not be transparent. To execute public function logic in the constructor, this function will call `_initialize` (marked internal, more detail below).

### Public functions

These are functions that have transparent logic, will execute in a publicly verifiable context and can update public storage.

- `set_admin` enables the admin to be updated
- `set_minter` enables accounts to be added / removed from the approved minter list
- `mint_public` enables tokens to be minted to the public balance of an account
- `mint_private` enables tokens to be minted to the private balance of an account (withe some caveats we will dig into later)
- `shield` enables tokens to be moved from a public balance to a private balance, not necessarily the same account (step 1 of a 2 step process)
- `transfer_public` enables users to transfer tokens from one public balance to another account's public balance
- `burn_public` enables users to burn tokens

### Private functions

These are functions that have private logic and will be executed on user devices to maintain privacy. The only data that is submitted to the network is a proof of correct execution, new data [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) and [nullifiers](https://aztec-docs-dev.netlify.app/concepts/advanced/data_structures/trees#nullifier-tree), so users will not reveal which contract they are interacting with or which function they are executing. The only information that will be revealed publicly is that someone executed a private transaction on Aztec.

- `redeem_shield` enables accounts to claim tokens that have been made private via `mint_private` or `shield` by providing the secret
- `unshield` enables an account to send tokens from their private balance to any other account's public balance
- `transfer` enables an account to send tokens from their private balance to another account's private balance
- `burn` enables tokens to be burned privately

### Internal functions

Internal functions are function that can only be called the contract itself. These can be used when the contract needs to call one of it's public functions from one of it's private functions.

- `_initialize` is a way to call a public function from the `constructor` (which is a private function)
- `_increase_public_balance` increases the public balance of an account when `unshield` is called
- `_reduce_total_supply` reduces the total supply of tokens when a token is privately burned

For this to make more sense, let's review some details of an Aztec transaction, particularly how a transaction "moves through" these contexts.

#### Execution contexts

Execution contexts for an Aztec transaction:

Step 1. Private Execution

Users provide inputs and execute locally on a their device for privacy reasons. Outputs of the private execution are commitment and nullifier updates, a proof of correct execution and any return data to pass to the public execution context.

Step 2. Public Execution

This happens remotely by the sequencer, which takes inputs from the private execution and runs the public code in the network virtual machine, similar to any other public blockchain.

Step 3. Ethereum execution

Aztec transactions can pass data directly to Ethereum contracts. The technical details of this are beyond the scope of this tutorial, but we will cover them in an upcoming piece.

### Unconstrained functions

Unconstrained functions can be thought of as view functions from Solidity--they just return information from the contract storage or compute and return data without modifying contract storage.

<!-- TODO add note about  compute_note_hash_and_nullifier  -->

## Contract dependencies

Before we can implement the functions, we need set up the contract storage, and before we do that we need to import the appropriate dependencies.

Just below the contract definition, add the following imports:

```rust
contract Token {
    use dep::std::option::Option;

    use dep::safe_math::SafeU120;

    use dep::value_note::{
        balance_utils,
        utils::{increment, decrement},
        value_note::{VALUE_NOTE_LEN, ValueNoteMethods, ValueNote},
    };

    use dep::aztec::{
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        context::{PrivateContext, PublicContext, Context},
        state_vars::{map::Map, public_state::PublicState, set::Set},
        types::type_serialisation::field_serialisation::{
            FieldSerialisationMethods, FIELD_SERIALISED_LEN,
        },
        oracle::compute_selector::compute_selector,
    };

    use crate::types::{AztecAddress, TransparentNote, TransparentNoteMethods, TRANSPARENT_NOTE_LEN};
    use crate::account_interface::AccountContract;
    use crate::util::{compute_message_hash};
```

We are importing the Option type, items from the `value_note` library to help manage private value storage, note utilities, context (for managing private and public execution contexts), `state_vars` for helping manage state, `types` for data manipulation and `oracle` for help passing data from the private to public execution context.

[SafeU120](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/safe-math/src/safe_u120.nr) is a library to do safe math operations on unsigned integers that protects against overflows and underflows.

For more detail on execution contexts, see these docs pages:

<!-- TODO: update link -->

- https://aztec-docs-dev.netlify.app/concepts/foundation/communication/main

We are also importing types from a `types.nr` file. Copy [this file](./contracts/src/types.nr) into your `token_contract_tutorial/contracts/token_contract/src` directory next to main.nr. The main thing to note from this types file is the `TransparentNote` definition. This defines how the contract moves value from the public domain into the private domain. It is similar to the `value_note` that we imported, but with some modifications namely, instead of a defined `owner`, it allows anyone that can produce the pre-image to the stored `secret_hash` to spend the note.

Private state in Aztec is all [UTXOs](https://en.wikipedia.org/wiki/Unspent_transaction_output) under the hood. Handling UTXOs is largely abstracted away from developers, but there are some unique things for developers to be aware of when creating and managing private state in an Aztec contract.

See this page of the docs to learn more about public and private state in Aztec.

<!-- TODO: update link -->

- https://aztec-docs-dev.netlify.app/dev_docs/contracts/state_variables

We have a couple more files to copy into our contract directory. Copy [`account_interface.nr`](./contracts/src/account_interface.nr) and [`util.nr`](./contracts/src/util.nr) into `token_contract_tutorial/contracts/token_contract/src` as well. `account_interface.nr` provides part of the interface of an account contract that the token contract will use to verify that a contract has been authorized to spend tokens on behalf of the user. Token authorization can happen in the public as well as the private contexts. This also highlights the composable nature of Aztec contracts (e.g. the token contract can check with an Account Contract to ensure tokens are approved for spending).

The function defined in `util.nr` will be helpful for generating message hashes that are used when communicating between contracts.

<!-- TODO: update link -->

- Read more about Account Contracts [here](https://aztec-docs-dev.netlify.app/dev_docs/wallets/writing_an_account_contract).
- View the Account Contract with AuthWitness [here](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/noir-contracts/src/contracts/schnorr_auth_witness_account_contract/src/main.nr)

## Contract Storage

Now that we have dependencies imported into our contract we can define the storage for the contract.

Below the dependencies, paste the following Storage struct:

```rust
    struct Storage {
        admin: PublicState<Field, FIELD_SERIALISED_LEN>,
        minters: Map<PublicState<Field, FIELD_SERIALISED_LEN>>,
        balances: Map<Set<ValueNote, VALUE_NOTE_LEN>>,
        total_supply: PublicState<Field, FIELD_SERIALISED_LEN>,
        pending_shields: Set<TransparentNote, TRANSPARENT_NOTE_LEN>,
        public_balances: Map<PublicState<Field, FIELD_SERIALISED_LEN>>,
    }
```

Reading through the storage variables:

- `admin` a single Field value stored in public state. `FIELD_SERIALISED_LEN` indicates the length of the variable, which is 1 in this case because it's a single Field element. A `Field` is basically an unsigned integer with a maximum value determined by the underlying cryptographic curve.
- `minters` is a mapping of Fields in public state. This will store whether an account is an approved minter on the contract.
- `balances` is a mapping of private balances. Private balances are stored in a `Set` of `ValueNote`s.
- `total_supply` is a Field value stored in public state and represents the total number of tokens minted.
- `pending_shields` is a `Set` of `TransparentNote`s stored in private state.
- `public_balances` is a mapping field elements in public state and represents the publicly viewable balances of accounts.

<!-- TODO: update link -->

https://aztec-docs-dev.netlify.app/dev_docs/contracts/storage

### Initializing Storage

Once we have Storage defined, we need to specify how to initialize it. The `init` method creates and initializes an instance of `Storage`. We define an initialization method for each of the storage variables defined above. Storage initialization is generic and can largely be reused for similar types, across different contracts, but it is important to note that each storage variable specifies it's storage slot, starting at 1.

Also, the public storage variables define the type that they store by passing the methods by which they are serialized, so `FieldSerialisationMethods` in this case.

```rust
    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                // storage slot 1
                admin: PublicState::new(
                    context,
                    1,
                    FieldSerialisationMethods,
                ),
                // storage slot 2
                minters: Map::new(
                    context,
                    2,
                    |context, slot| {
                        PublicState::new(
                            context,
                            slot,
                            FieldSerialisationMethods,
                        )
                    },
                ),
                // storage slot 3
                balances: Map::new(
                    context,
                    3,
                    |context, slot| {
                        Set::new(context, slot, ValueNoteMethods)
                    },
                ),
                // storage slot 4
                total_supply: PublicState::new(
                    context,
                    4,
                    FieldSerialisationMethods,
                ),
                // storage slot 5
                pending_shields: Set::new(context, 5, TransparentNoteMethods),
                // storage slot 6
                public_balances: Map::new(
                    context,
                    6,
                    |context, slot| {
                        PublicState::new(
                            context,
                            slot,
                            FieldSerialisationMethods,
                        )
                    },
                ),
            }
        }
    }
```

## Functions

Copy and paste the body of each function into the appropriate place in your project if you are following along.

### Constructor

In the source code, the constructor logic is commented out. I uncommented it here for legibility, but you should comment out the body of the function in your example, otherwise the contract may not compile.

```rust
    #[aztec(private)]
    fn constructor() {
        // Currently not possible to execute public calls from constructor as code not yet available to sequencer.
        let selector = compute_selector("_initialize((Field))");
        let _callStackItem = context.call_public_function(context.this_address(), selector, [context.msg_sender()]);
    }
```

The constructor is a private function. There isn't any private state to set up in this function, but there is public state to set up. The `context` is a global variable that is available to private and public functions, but the available methods differ based on the context. You can see the details [here](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/aztec/src/context.nr). The `context.call_public_function` allows a private function to call a public function on any contract. In this case, the constructor is passing the `msg_sender` as the argument to the `_initialize` function, which is also defined in this contract.

### Public function implementations

Every public function initializes storage using the public context like so:

```rust
let storage = Storage::init(Context::public(&mut context));
```

After this, storage is referenced as `storage.variable`. We won't go over this step in any of the following function descriptions.

#### `set_admin`

After storage is initialized, the contract checks that the `msg_sender` is the `admin`. If not, the transaction will fail. If it is, the `new_admin` is saved as the `admin`.

```rust
    #[aztec(public)]
    fn set_admin(
        new_admin: AztecAddress,
    ) {
        let storage = Storage::init(Context::public(&mut context));
        assert(storage.admin.read() == context.msg_sender(), "caller is not admin");
        storage.admin.write(new_admin.address);
    }
```

#### `set_minter`

This function allows the `admin` to add or a remove a `minter` from the public `minters` mapping. First, the function checks that `approve` is either 1 or 0, then initialized storage. Then it checks that `msg_sender` is the `admin` and finally adds the `minter` to the `minters` mapping.

```rust
    #[aztec(public)]
    fn set_minter(
        minter: AztecAddress,
        approve: Field,
    ) {
        assert((approve == 1) | (approve == 0), "not providing boolean");
        let storage = Storage::init(Context::public(&mut context));
        assert(storage.admin.read() == context.msg_sender(), "caller is not admin");
        storage.minters.at(minter.address).write(approve as Field);
    }
```

#### `mint_public`

This function allows an account approved in the `minters` mapping to create new public tokens owned by the provided `to` address.

First, storage is initialized. Then the function checks that the `msg_sender` is approved to mint in the `minters` mapping. If it is, a new `SafeU120` value is created of the `amount` provided. The function reads the recipients public balance and then adds the amount to mint, saving the output as `new_balance`, then reads to total supply and adds the amount to mint, saving the output as `supply`. `new_balance` and `supply` are then written to storage.

The function returns 1 to indicate successful execution.

```rust
    #[aztec(public)]
    fn mint_public(
        to: AztecAddress,
        amount: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));
        assert(storage.minters.at(context.msg_sender()).read() == 1, "caller is not minter");
        let amount = SafeU120::new(amount);
        let new_balance = SafeU120::new(storage.public_balances.at(to.address).read()).add(amount);
        let supply = SafeU120::new(storage.total_supply.read()).add(amount);

        storage.public_balances.at(to.address).write(new_balance.value as Field);
        storage.total_supply.write(supply.value as Field);
        1
    }
```

#### `mint_private`

```rust
    #[aztec(public)]
    fn mint_private(
        amount: Field,
        secret_hash: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));
        assert(storage.minters.at(context.msg_sender()).read() == 1, "caller is not minter");
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount, secret_hash);
        let supply = SafeU120::new(storage.total_supply.read()).add(SafeU120::new(amount));

        storage.total_supply.write(supply.value as Field);
        pending_shields.insert_from_public(&mut note);
        1
    }
```

#### `shield`

```rust
    #[aztec(public)]
    fn shield(
        from: AztecAddress,
        amount: Field,
        secret_hash: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));

        if (from.address != context.msg_sender()) {
            // The redeem is only spendable once, so we need to ensure that you cannot insert multiple shields from the same message.
            let selector = compute_selector("shield((Field),Field,Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, amount, secret_hash, nonce]);
            AccountContract::at(from.address).is_valid(Context::public(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = SafeU120::new(storage.public_balances.at(from.address).read()).sub(amount);

        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount.value as Field, secret_hash);

        storage.public_balances.at(from.address).write(from_balance.value as Field);
        pending_shields.insert_from_public(&mut note);
        1
    }
```

#### `transfer_public`

```rust
    #[aztec(public)]
    fn transfer_public(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));

        if (from.address != context.msg_sender()) {
            let selector = compute_selector("transfer_public((Field),(Field),Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, to.address, amount, nonce]);
            AccountContract::at(from.address).is_valid(Context::public(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = SafeU120::new(storage.public_balances.at(from.address).read()).sub(amount);
        storage.public_balances.at(from.address).write(from_balance.value as Field);

        let to_balance = SafeU120::new(storage.public_balances.at(to.address).read()).add(amount);
        storage.public_balances.at(to.address).write(to_balance.value as Field);

        1
    }
```

#### `burn_public`

```rust
    #[aztec(public)]
    fn burn_public(
        from: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));

        if (from.address != context.msg_sender()) {
            let selector = compute_selector("burn_public((Field),Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, amount, nonce]);
            AccountContract::at(from.address).is_valid(Context::public(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = SafeU120::new(storage.public_balances.at(from.address).read()).sub(amount);
        storage.public_balances.at(from.address).write(from_balance.value as Field);

        let new_supply = SafeU120::new(storage.total_supply.read()).sub(amount);
        storage.total_supply.write(new_supply.value as Field);

        1
    }
```

### Private function implementations

#### `redeem_shield`

```rust
    #[aztec(private)]
    fn redeem_shield(
        to: AztecAddress,
        amount: Field,
        secret: Field,
    ) -> Field {
        let storage = Storage::init(Context::private(&mut context));
        let pending_shields = storage.pending_shields;
        let balance = storage.balances.at(to.address);
        let mut public_note = TransparentNote::new_from_secret(amount, secret);

        pending_shields.assert_contains_and_remove_publicly_created(&mut public_note);
        increment(balance, amount, to.address);

        1
    }
```

#### `unshield`

```rust
    #[aztec(private)]
    fn unshield(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::private(&mut context));

        if (from.address != context.msg_sender()) {
            let selector = compute_selector("unshield((Field),(Field),Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, to.address, amount, nonce]);
            AccountContract::at(from.address).is_valid(Context::private(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let from_balance = storage.balances.at(from.address);
        decrement(from_balance, amount, from.address);

        let selector = compute_selector("_increase_public_balance((Field),Field)");
        let _void = context.call_public_function(context.this_address(), selector, [to.address, amount]);

        1
    }
```

#### `transfer`

```rust
    #[aztec(private)]
    fn transfer(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::private(&mut context));

        if (from.address != context.msg_sender()) {
            let selector = compute_selector("transfer((Field),(Field),Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, to.address, amount, nonce]);
            AccountContract::at(from.address).is_valid(Context::private(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let from_balance = storage.balances.at(from.address);
        let to_balance = storage.balances.at(to.address);

        decrement(from_balance, amount, from.address);
        increment(to_balance, amount, to.address);

        1
    }
```

#### `burn`

```rust
    #[aztec(private)]
    fn burn(
        from: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        let storage = Storage::init(Context::private(&mut context));

        if (from.address != context.msg_sender()) {
            let selector = compute_selector("burn((Field),Field,Field)");
            let message_field = compute_message_hash([context.msg_sender(), context.this_address(), selector, from.address, amount, nonce]);
            AccountContract::at(from.address).is_valid(Context::private(&mut context), message_field);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let from_balance = storage.balances.at(from.address);

        decrement(from_balance, amount, from.address);

        let selector = compute_selector("_reduce_total_supply(Field)");
        let _void = context.call_public_function(context.this_address(), selector, [amount]);

        1
    }
```

### Internal function implementations

```rust
    // We cannot do this from the constructor currently
    // Since this should be internal, for now, we ignore the safety checks of it, as they are
    // enforced by it being internal and only called from the constructor.
    #[aztec(public)]
    fn _initialize(
        new_admin: AztecAddress,
    ) {
        let storage = Storage::init(Context::public(&mut context));
        storage.admin.write(new_admin.address);
        storage.minters.at(new_admin.address).write(1);
    }
```

#### `_increase_public_balance`

```rust
    #[aztec(public)]
    internal fn _increase_public_balance(
        to: AztecAddress,
        amount: Field,
    ) {
        let storage = Storage::init(Context::public(&mut context));
        let new_balance = SafeU120::new(storage.public_balances.at(to.address).read()).add(SafeU120::new(amount));
        storage.public_balances.at(to.address).write(new_balance.value as Field);
    }
```

#### `_reduce_total_supply`

```rust
    #[aztec(public)]
    internal fn _reduce_total_supply(
        amount: Field,
    ) {
        // Only to be called from burn.
        let storage = Storage::init(Context::public(&mut context));
        let new_supply = SafeU120::new(storage.total_supply.read()).sub(SafeU120::new(amount));
        storage.total_supply.write(new_supply.value as Field);
    }
```

### Unconstrained function implementations

#### `admin`

```rust
    unconstrained fn admin() -> Field {
        let storage = Storage::init(Context::none());
        storage.admin.read()
    }
```

#### `is_minter`

```rust
    unconstrained fn is_minter(
        minter: AztecAddress,
    ) -> bool {
        let storage = Storage::init(Context::none());
        storage.minters.at(minter.address).read() as bool
    }
```

#### `total_supply`

```rust
    unconstrained fn total_supply() -> Field {
        let storage = Storage::init(Context::none());
        storage.total_supply.read()
    }
```

#### `balance_of_private`

```rust
    unconstrained fn balance_of_private(
        owner: AztecAddress,
    ) -> Field {
        let storage = Storage::init(Context::none());
        let owner_balance = storage.balances.at(owner.address);

        balance_utils::get_balance(owner_balance)
    }
```

#### `balance_of_public`

```rust
    unconstrained fn balance_of_public(
        owner: AztecAddress,
    ) -> Field {
        let storage = Storage::init(Context::none());
        storage.public_balances.at(owner.address).read()
    }
```

#### `compute_note_hash_and_nullifier`

```rust
    // Computes note hash and nullifier.
    // Note 1: Needs to be defined by every contract producing logs.
    // Note 2: Having it in all the contracts gives us the ability to compute the note hash and nullifier differently for different kind of notes.
    unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {
        let note_header = NoteHeader { contract_address, nonce, storage_slot };
        if (storage_slot == 5) {
            note_utils::compute_note_hash_and_nullifier(TransparentNoteMethods, note_header, preimage)
        } else {
            note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
        }
    }
```
