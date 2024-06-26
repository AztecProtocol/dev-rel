# Token Contract Tutorial

In this tutorial we will go through writing an L2 native token contract
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
noirup -v 0.16.0
```

This command ensures that you are on the latest `aztec` version of noirup, which is what we need to compile and deploy aztec.nr smart contracts. The `aztec` tag points to the latest build, so if you are running the Sandbox and `aztec-cli` as well, make sure you are using the latest versions of those as well--we will be regularly shipping breaking changes so mis-matched versions may not work.

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
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/aztec" }
value_note = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/value-note" }
safe_math = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/safe-math" }
authwit = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/aztec-nr/authwit" }
```

## Contract Interface

```rust
contract Token {
    #[aztec(private)]
    fn constructor() {}

    #[aztec(public)]
    fn set_admin(new_admin: AztecAddress) {}

    #[aztec(public)]
    fn set_minter(minter: AztecAddress, approve: bool) {}

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

    // Unconstrained functions (read-only)

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

Unconstrained functions can be thought of as view functions from Solidity--they only return information from the contract storage or compute and return data without modifying contract storage.

<!-- TODO add note about  compute_note_hash_and_nullifier  -->

## Contract dependencies

Before we can implement the functions, we need set up the contract storage, and before we do that we need to import the appropriate dependencies.

Just below the contract definition, add the following imports:

```rust
mod types;
contract Token {
    // Libs
    use dep::std::option::Option;

    use dep::safe_math::SafeU120;

    use dep::aztec::{
        note::{
            note_getter_options::NoteGetterOptions,
            note_header::NoteHeader,
            utils as note_utils,
        },
        context::{PrivateContext, PublicContext, Context},
        hash::{compute_secret_hash},
        state_vars::{map::Map, public_state::PublicState, set::Set},
        types::type_serialization::{
            field_serialization::{FieldSerializationMethods, FIELD_SERIALIZED_LEN},
            bool_serialization::{BoolSerializationMethods, BOOL_SERIALIZED_LEN},
            aztec_address_serialization::{AztecAddressSerializationMethods, AZTEC_ADDRESS_SERIALIZED_LEN},
        },
        types::address::{AztecAddress},
        selector::compute_selector,
    };

    use dep::authwit::{
        auth::{
            assert_current_call_valid_authwit, 
            assert_current_call_valid_authwit_public, 
        },
    };

    use crate::types::{
        transparent_note::{TransparentNote, TransparentNoteMethods, TRANSPARENT_NOTE_LEN},
        token_note::{TokenNote, TokenNoteMethods, TOKEN_NOTE_LEN},
        balances_map::{BalancesMap},
        safe_u120_serialization::{SafeU120SerializationMethods, SAFE_U120_SERIALIZED_LEN}
    };
```

We are importing the Option type, items from the `value_note` library to help manage private value storage, note utilities, context (for managing private and public execution contexts), `state_vars` for helping manage state, `types` for data manipulation and `oracle` for help passing data from the private to public execution context. We also import the `auth` [library](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/aztec/src/auth.nr) to handle token approvals from [Account Contracts](https://aztec-docs-dev.netlify.app/concepts/foundation/accounts/main).

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
        admin: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        minters: Map<PublicState<bool, BOOL_SERIALIZED_LEN>>,
        balances: BalancesMap,
        total_supply: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
        pending_shields: Set<TransparentNote, TRANSPARENT_NOTE_LEN>,
        public_balances: Map<PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>>,
    }
```

Reading through the storage variables:

- `admin` a single Field value stored in public state. `FIELD_SERIALISED_LEN` indicates the length of the variable, which is 1 in this case because it's a single Field element. A `Field` is basically an unsigned integer with a maximum value determined by the underlying cryptographic curve.
- `minters` is a mapping of Fields in public state. This will store whether an account is an approved minter on the contract.
- `balances` is a mapping of private balances. Private balances are stored in a `Set` of `ValueNote`s.
- `total_supply` is a Field value stored in public state and represents the total number of tokens minted.
- `pending_shields` is a `Set` of `TransparentNote`s stored in private state. What is stored publicly is a set of commitments to `TransparentNote`s.
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
                admin: PublicState::new(
                    context,
                    1,
                    AztecAddressSerializationMethods,
                ),
                minters: Map::new(
                    context,
                    2,
                    |context, slot| {
                        PublicState::new(
                            context,
                            slot,
                            BoolSerializationMethods,
                        )
                    },
                ),
                balances: BalancesMap::new(context, 3),
                total_supply: PublicState::new(
                    context,
                    4,
                    SafeU120SerializationMethods,
                ),
                
                pending_shields: Set::new(context, 5, TransparentNoteMethods),
                
                public_balances: Map::new(
                    context,
                    6,
                    |context, slot| {
                        PublicState::new(
                            context,
                            slot,
                            SafeU120SerializationMethods,
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
    fn constructor(admin: AztecAddress) {
        let selector = compute_selector("_initialize((Field))");
        context.call_public_function(context.this_address(), selector, [admin.address]);
    }
```

The constructor is a private function. There isn't any private state to set up in this function, but there is public state to set up. The `context` is a global variable that is available to private and public functions, but the available methods differ based on the context. You can see the details [here](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/aztec/src/context.nr). The `context.call_public_function` allows a private function to call a public function on any contract. In this case, the constructor is passing the `msg_sender` as the argument to the `_initialize` function, which is also defined in this contract.

### Public function implementations

Public functions are declared with the `#[aztec(public)]` macro above the function name like so:

```rust
    #[aztec(public)]
    fn set_admin(
        new_admin: AztecAddress,
```

As described in the [execution contexts section above](#execution-contexts), public function logic and transaction information is transparent to the world. Public functions update public state, but can be used to prepare data to be used in a private context, as we will go over below (e.g. see the [shield](#shield) function).

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
        assert(storage.admin.read().eq(AztecAddress::new(context.msg_sender())), "caller is not admin");
        storage.admin.write(new_admin);
    }
```

#### `set_minter`

This function allows the `admin` to add or a remove a `minter` from the public `minters` mapping. It checks that `msg_sender` is the `admin` and finally adds the `minter` to the `minters` mapping.

```rust
    #[aztec(public)]
    fn set_minter(
        minter: AztecAddress,
        approve: bool,
    ) {
        assert(storage.admin.read().eq(AztecAddress::new(context.msg_sender())), "caller is not admin");
        storage.minters.at(minter.address).write(approve); 
    }
```

#### `mint_public`

This function allows an account approved in the public `minters` mapping to create new public tokens owned by the provided `to` address.

First, storage is initialized. Then the function checks that the `msg_sender` is approved to mint in the `minters` mapping. If it is, a new `SafeU120` value is created of the `amount` provided. The function reads the recipients public balance and then adds the amount to mint, saving the output as `new_balance`, then reads to total supply and adds the amount to mint, saving the output as `supply`. `new_balance` and `supply` are then written to storage.

The function returns 1 to indicate successful execution.

```rust
    #[aztec(public)]
    fn mint_public(
        to: AztecAddress,
        amount: Field,
    ) -> Field {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        
        let amount = SafeU120::new(amount);
        let new_balance = storage.public_balances.at(to.address).read().add(amount);
        let supply = storage.total_supply.read().add(amount);

        storage.public_balances.at(to.address).write(new_balance);
        storage.total_supply.write(supply);
        1
    }
```

#### `mint_private`

This public function allows an account approved in the public `minters` mapping to create new private tokens that can be claimed by anyone that has the pre-image to the `secret_hash`.

Following the logic, first, public storage is initialized. Then it checks that the `msg_sender` is an approved minter. Then a new `TransparentNote` is created with the specified `amount` and `secret_hash`. You can read the details of the `TransparentNote` in the `types.nr` file [here](https://github.com/AztecProtocol/aztec-packages/blob/2fe845f2f0cb46c8940826045a703de333b8b0f5/yarn-project/noir-contracts/src/contracts/token_contract/src/types.nr#L61). The `amount` is added to the existing public `total_supply` and the storage value is updated. Then the new `TransparentNote` is added to the `pending_shields` using the `insert_from_public` function, which is accessible on the `Set` type. Then it's ready to be claimed by anyone with the `secret_hash` pre-image using the `redeem_shield` function. It returns `1` to indicate successful execution.

```rust
    #[aztec(public)]
    fn mint_private(
        amount: Field,
        secret_hash: Field,
    ) -> Field {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount, secret_hash);
        let supply = storage.total_supply.read().add(SafeU120::new(amount));

        storage.total_supply.write(supply);
        pending_shields.insert_from_public(&mut note);
        1
    }
```

#### `shield`

This public function enables an account to stage tokens from it's `public_balance` to be claimed as a private `TransparentNote` by any account that has the pre-image to the `secret_hash`.

First, storage is initialized. Then it checks whether the calling contract (`context.msg_sender`) matches the account that the funds will be debited from.

##### Authorizing token spends

If the `msg_sender` is **NOT** the same as the account to debit from, the function checks that the account has authorized the `msg_sender` contract to debit tokens on its behalf. This check is done by computing the function selector that needs to be authorized (in this case, the `shield` function), computing the hash of the message that the account contract has approved. This is a hash of the contract that is approved to spend (`context.msg_sender`), the token contract that can be spent from (`context.this_address()`), the `selector`, the account to spend from (`from.address`), the `amount`, the `secret_hash` and a `nonce` to prevent multiple spends. This hash is passed to `assert_valid_public_message_for` to ensure that the Account Contract has approved tokens to be spent on it's behalf.

If the `msg_sender` is the same as the account to debit tokens from, the authorization check is bypassed and the function proceeds to update the account's `public_balance` and adds a new `TransparentNote` to the `pending_shields`.

It returns `1` to indicate successful execution.

```rust
    #[aztec(public)]
    fn shield(
        from: AztecAddress,
        amount: Field,
        secret_hash: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            // The redeem is only spendable once, so we need to ensure that you cannot insert multiple shields from the same message.
            assert_current_call_valid_authwit_public(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = storage.public_balances.at(from.address).read().sub(amount);

        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount.value as Field, secret_hash);

        storage.public_balances.at(from.address).write(from_balance);
        pending_shields.insert_from_public(&mut note);
        1
    }
```

#### `transfer_public`

This public function enables public transfers between Aztec accounts. The sender's public balance will be debited the specified `amount` and the recipient's public balances will be credited with that amount.

After storage is initialized, the [authorization flow specified above](#authorizing-token-spends) is checked. Then the sender and recipient's balances are updated and saved to storage using the `SafeU120` library.

```rust
    #[aztec(public)]
    fn transfer_public(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit_public(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = storage.public_balances.at(from.address).read().sub(amount);
        storage.public_balances.at(from.address).write(from_balance);

        let to_balance = storage.public_balances.at(to.address).read().add(amount);
        storage.public_balances.at(to.address).write(to_balance);

        1
    }
```

#### `burn_public`

This public function enables public burning (destroying) of tokens from the sender's public balance.

After storage is initialized, the [authorization flow specified above](#authorizing-token-spends) is checked. Then the sender's public balance and the `total_supply` are updated and saved to storage using the `SafeU120` library.

```rust
    #[aztec(public)]
    fn burn_public(
        from: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit_public(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        let from_balance = storage.public_balances.at(from.address).read().sub(amount);
        storage.public_balances.at(from.address).write(from_balance);

        let new_supply = storage.total_supply.read().sub(amount);
        storage.total_supply.write(new_supply);

        1
    }
```

### Private function implementations

Private functions are declared with the `#[aztec(private)]` macro above the function name like so:

```rust
    #[aztec(private)]
    fn redeem_shield(
```

As described in the [execution contexts section above](#execution-contexts), private function logic and transaction information is hidden from the world and is executed on user devices. Private functions update private state, but can pass data to the public execution context (e.g. see the [`unshield`](#unshield) function).

#### `redeem_shield`

This private function enables an account to move tokens from a `TransparentNote` in the `pending_shields` mapping to any Aztec account as a `ValueNote` in private `balances`.

Going through the function logic, first storage is initialized. Then it gets the private balance for the recipient. A `TransparentNote` is created from the `amount` and `secret` and verified to exist storage in `pending_shields` with the `assert_contains_and_remove_publicly_created` method. If that is verified, the recipient's private balance is incremented using the `increment` helper function from the `value_note` [library](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/value-note/src/utils.nr).

The function returns `1` to indicate successful execution.

```rust
    #[aztec(private)]
    fn redeem_shield(
        to: AztecAddress,
        amount: Field,
        secret: Field,
    ) -> Field {
        let pending_shields = storage.pending_shields;
        let secret_hash = compute_secret_hash(secret);
        // Get 1 note (set_limit(1)) which has amount stored in field with index 0 (select(0, amount)) and secret_hash
        // stored in field with index 1 (select(1, secret_hash)).
        let options = NoteGetterOptions::new().select(0, amount).select(1, secret_hash).set_limit(1);
        let notes = pending_shields.get_notes(options);
        let note = notes[0].unwrap_unchecked();
        // Remove the note from the pending shields set 
        pending_shields.remove(note);

        // Add the token note to user's balances set
        storage.balances.at(to).add(SafeU120::new(amount));

        1
    }
```

#### `unshield`

This private function enables un-shielding of private `ValueNote`s stored in `balances` to any Aztec account's `public_balance`.

After initializing storage, the function checks that the `msg_sender` is authorized to spend tokens. See [the Authorizing token spends section](#authorizing-token-spends) above for more detail--the only difference being that `assert_valid_message_for` is modified to work specifically in the private context. After the authorization check, the sender's private balance is decreased using the `decrement` helper function for the `value_note` library. Then it stages a public function call on this contract ([`_increase_public_balance`](#_increase_public_balance)) to be executed in the [public execution phase](#execution-contexts) of transaction execution. `_increase_public_balance` is marked as an `internal` function, so can only be called by this token contract.

The function returns `1` to indicate successful execution.

```rust
    #[aztec(private)]
    fn unshield(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        storage.balances.at(from).sub(SafeU120::new(amount));

        let selector = compute_selector("_increase_public_balance((Field),Field)");
        let _void = context.call_public_function(context.this_address(), selector, [to.address, amount]);

        1
    }
```

#### `transfer`

This private function enables private token transfers between Aztec accounts.

After initializing storage, the function checks that the `msg_sender` is authorized to spend tokens. See [the Authorizing token spends section](#authorizing-token-spends) above for more detail--the only difference being that `assert_valid_message_for` is modified to work specifically in the private context. After authorization, the function gets the current balances for the sender and recipient and decrements and increments them, respectively, using the `value_note` helper functions.

```rust
    #[aztec(private)]
    fn transfer(
        from: AztecAddress,
        to: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        let amount = SafeU120::new(amount);
        storage.balances.at(from).sub(amount);
        storage.balances.at(to).add(amount);

        1
    }
```

#### `burn`

This private function enables accounts to privately burn (destroy) tokens.

After initializing storage, the function checks that the `msg_sender` is authorized to spend tokens. Then it gets the sender's current balance and decrements it. Finally it stages a public function call to [`_reduce_total_supply`](#_reduce_total_supply).

```rust
    #[aztec(private)]
    fn burn(
        from: AztecAddress,
        amount: Field,
        nonce: Field,
    ) -> Field {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }

        storage.balances.at(from).sub(SafeU120::new(amount));

        let selector = compute_selector("_reduce_total_supply(Field)");
        let _void = context.call_public_function(context.this_address(), selector, [amount]);

        1
    }
```

### Internal function implementations

Internal functions are functions that can only be called by this contract. The following 3 functions are public functions that are called from the [private execution context](#execution-contexts). Marking these as `internal` ensures that only the desired private functions in this contract are able to call them. Private functions defer execution to public functions because private functions cannot update public state directly.

#### `_initialize`

This function is called via the [constructor](#constructor). Note that it is not actually marked `internal` right now--this is because this functionality is still being worked on.

This function sets the creator of the contract (passed as `msg_sender` from the constructor) as the admin and makes them a minter.

```rust
    #[aztec(public)]
    internal fn _initialize(
        new_admin: AztecAddress,
    ) {
        storage.admin.write(new_admin);
        storage.minters.at(new_admin.address).write(true);
    }
```

#### `_increase_public_balance`

This function is called from [`unshield`](#unshield). The account's private balance is decremented in `shield` and the public balance is increased in this function.

```rust
    #[aztec(public)]
    internal fn _increase_public_balance(
        to: AztecAddress,
        amount: Field,
    ) {
        let new_balance = storage.public_balances.at(to.address).read().add(SafeU120::new(amount));
        storage.public_balances.at(to.address).write(new_balance);
    }
```

#### `_reduce_total_supply`

This function is called from [`burn`](#burn). The account's private balance is decremened in `burn` and the public `total_supply` is reduced in this function.

```rust
    #[aztec(public)]
    internal fn _reduce_total_supply(
        amount: Field,
    ) {
        // Only to be called from burn.
        let new_supply = storage.total_supply.read().sub(SafeU120::new(amount));
        storage.total_supply.write(new_supply);
    }
```

### Unconstrained function implementations

Unconstrained functions are similar to `view` functions in Solidity in that they only return information from the contract storage or compute and return data without modifying contract storage.

#### `admin`

A getter function for reading the public `admin` value.

```rust
    unconstrained fn admin() -> Field {
        storage.admin.read().address
    }
```

#### `is_minter`

A getter function for checking the value of associated with a `minter` in the public `minters` mapping.

```rust
    unconstrained fn is_minter(
        minter: AztecAddress,
    ) -> bool {
        let storage = Storage::init(Context::none());
        storage.minters.at(minter.address).read() as bool
    }
```

#### `total_supply`

A getter function for checking the token `total_supply`.

```rust
    unconstrained fn is_minter(
        minter: AztecAddress,
    ) -> bool {
        storage.minters.at(minter.address).read()
    }
```

#### `balance_of_private`

A getter function for checking the private balance of the provided Aztec account. Note that the [Aztec RPC Server](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/aztec-rpc) must have access to the `owner`s decryption keys in order to decrypt their notes.

```rust
    unconstrained fn balance_of_private(
        owner: AztecAddress,
    ) -> u120 {
        storage.balances.at(owner).balance_of().value
    }
```

#### `balance_of_public`

A getter function for checking the public balance of the provided Aztec account.

```rust
    unconstrained fn balance_of_public(
        owner: AztecAddress,
    ) -> u120 {
        storage.public_balances.at(owner.address).read().value
    }
```

#### `compute_note_hash_and_nullifier`

A getter function to compute the note hash and nullifier for notes in the contract's storage.

```rust
    // Computes note hash and nullifier.
    // Note 1: Needs to be defined by every contract producing logs.
    // Note 2: Having it in all the contracts gives us the ability to compute the note hash and nullifier differently for different kind of notes.
    unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; TOKEN_NOTE_LEN]) -> [Field; 4] {
        let note_header = NoteHeader::new(contract_address, nonce, storage_slot);
        if (storage_slot == 5) {
            note_utils::compute_note_hash_and_nullifier(TransparentNoteMethods, note_header, preimage)
        } else {
            note_utils::compute_note_hash_and_nullifier(TokenNoteMethods, note_header, preimage)
        }
    }
```

## Testing

End to end tests for reference:

https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/end-to-end/src/e2e_token_contract.test.ts
