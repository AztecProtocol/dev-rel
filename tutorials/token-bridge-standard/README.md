# Token Bridge Contract Tutorial

In this tutorial we will go through writing a standard L2 token bridge contract
for the Aztec Network, using the Aztec.nr contract libraries. It is recommended that you go through the [Standard Token tutorial](../token-standard/README.md) before this tutorial to gain some helpful contract.

What is the token bridge?
In Aztec, every contract on L2 can have a "portal" attached to it on L1 to help with L1<->L2 messaging. This is akin to how other L2s have a standard bridge for message passing. For a token on L1, you would have its portal contract on L1 too such that it can bridge to Aztec. The Standard Token covers how to write a token contract on L2, but how do you consume or emit L1<>L2 messages to talk to the L1 portal? This is what the bridge contract is! For every L2 token, we will also have a token bridge contract on L2. 

This has several advantages including
1. Separation of concerns - Token contract can stay minimal while this contract handles 
2. Any 3P bridge aggregators like Hop can use these cannonical token bridges. This way, it doesn't matter what bridge users use on Aztec. It solves the basic problem of bridging where hop-DAI is fundamentally different from Dai bridged from another bridge.
3. Any L2 native token can always be withdrawn to L1 instead of being limited to the L2. 

In this tutorial you will learn how to:

- Sending L1<>L2 messages in the public flow
- Sending L1<>L2 messages in the private flow
- Working with public<>private function composability

We are going to start with a blank project and fill in the code defined [here](./src/main.nr), and explain what is being added as we go.

## Requirements

You will need to install nargo, the Noir build too. if you are familiar with Rust, this is similar to cargo.

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v 0.11.1-aztec.0
```

This command ensures that you are on the latest `aztec` version of noirup, which is what we need to compile and deploy aztec.nr smart contracts. If you are running the Sandbox and `aztec-cli` as well, make sure you are using the latest versions of those as well--we will be regularly shipping breaking changes so mis-matched versions may not work.

You should also install the [Noir Language Support extension](https://marketplace.visualstudio.com/items?itemName=noir-lang.vscode-noir) for VS Code.

Check the [Dev Tools section](https://github.com/noir-lang/awesome-noir#dev-tools) of the awesome-noir repo for language support for additional editors (Vim, emacs, tree-sitter, etc).

## Project setup

Create a new directory called `token_bridge_contract_tutorial`

```bash
mkdir token_bridge_contract_tutorial
```

inside that directory, create a `contracts` folder for the Aztec contracts.

```bash
cd token_bridge_contract_tutorial && mkdir contracts && cd contracts
```

Create a new Noir project using nargo.

```bash
nargo init --name token_bridge_contract
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
name = "token_bridge_contract"
authors = [""]
compiler_version = "0.1"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-packages/", tag="master", directory="yarn-project/noir-libs/aztec-noir" }
```

## Contract Interface

```rust
contract Token {
    #[aztec(private)]
    fn constructor() {}

    #[aztec(public)]
    fn claim_public(
        to: AztecAddress,
        amount: Field,
        canceller: EthereumAddress,
        msg_key: Field,
        secret: Field,
    ) -> Field {}

    #[aztec(public)]
    fn exit_to_l1_public(
        recipient: EthereumAddress, // ethereum address to withdraw to
        amount: Field,
        callerOnL1: EthereumAddress, // ethereum address that can call this function on the L1 portal (0x0 if anyone can call)
        nonce: Field, // nonce used in the approval message by `msg.sender` to let bridge burn their tokens on L2
    ) -> Field {}

    // Private functions below

    #[aztec(private)]
    fn claim_private(
        amount: Field,
        secret_hash_for_redeeming_minted_notes: Field, // secret hash used to redeem minted notes at a later time. This enables anyone to call this function and mint tokens to a user on their behalf
        canceller: EthereumAddress,
        msg_key: Field, // L1 to L2 message key as derived from the inbox contract
        secret_for_L1_to_L2_message_consumption: Field, // secret used to consume the L1 to L2 message
    ) -> Field {}

    #[aztec(private)]
    fn exit_to_l1_private(
        recipient: EthereumAddress, // ethereum address to withdraw to
        token: AztecAddress,
        amount: Field,
        callerOnL1: EthereumAddress, // ethereum address that can call this function on the L1 portal (0x0 if anyone can call)
        nonce: Field, // nonce used in the approval message by `msg.sender` to let bridge burn their tokens on L2
    ) -> Field {}

    // Internal functions below

    // should be internal
    #[aztec(public)]
    fn _initialize(token: AztecAddress) {}

    #[aztec(public)]
    internal fn _call_mint_on_token(amount: Field, secret_hash: Field) {}

    #[aztec(public)]
    internal fn _assert_token_is_same(token: Field) {}

    // Unconstrained functions (read only)

    unconstrained fn token() -> Field {}
}
```

This specifies the interface of the `TokenBridge` contract. Go ahead and copy and paste this interface into your `main.nr` file.

Before we through the interface and implement each function, let's review the functions to get a sense of what the contract does.

There is a `constructor` function that will be executed once, when the contract is deployed, similar to the constructor function on Ethereum. This is marked private, so the function logic will not be transparent. To execute public function logic in the constructor, this function will call `_initialize` (marked internal, more detail below).

### Public functions

These are functions that have transparent logic, will execute in a publicly verifiable context and can update public storage.

- `claim_public` - Consumes an L1->L2 message and mints tokens publicly to the specified account
- `exit_to_l1_public` - Burns tokens from the caller and sends an L2->L1 withdrawal message publicly

### Private functions

These are functions that have private logic and will be executed on user devices to maintain privacy. The only data that is submitted to the network is a proof of correct execution, new data [commitments](https://en.wikipedia.org/wiki/Commitment_scheme) and [nullifiers](https://aztec-docs-dev.netlify.app/concepts/advanced/data_structures/trees#nullifier-tree), so users will not reveal which contract they are interacting with or which function they are executing. The only information that will be revealed publicly is that someone executed a private transaction on Aztec.

- `claim_private` - Consumes an L1->L2 message and mints tokens privately to the caller
- `exit_to_l1_private` - Burns tokens from the caller and sends an L2->L1 withdrawal message privately

### Internal functions

Internal functions are function that can only be called the contract itself. These can be used when the contract needs to call one of it's public functions from one of it's private functions.

- `_initialize` - Initializes the contract by setting the token address in storage
- `_call_mint_on_token` - Calls the public mint method on the token contract
- `_assert_token_is_same` - Asserts the provided token address matches the one in storage

For this to make more sense, let's review some details of an Aztec transaction, particularly how a transaction "moves through" these contexts.

#### Execution contexts

Execution contexts for an Aztec transaction:

1. Private Execution

Users provide inputs and execute locally on a their device for privacy reasons. Outputs of the private execution are commitment and nullifier updates, a proof of correct execution and any return data to pass to the public execution context.

2. Public Execution

This happens remotely by the sequencer, which takes inputs from the private execution and runs the public code in the network virtual machine, similar to any other public blockchain.

3. Private to Public function calls
Note that becuase private functions are executed locally, they don't operate on public state as that depends on the *current* state of the chain, which user doesn't have access to locally. As such, all public functions (regardless of where they are called in the code) are executed by the sequencer after all private functions are executed locally by the user.

More information can be found at:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/concepts/foundation/communication/public_private_calls

4. L1 to L2 message passing
A portal is the point of contact between L1 and a specific contract on Aztec i.e. a portal is a smart contract that resides on L1 and is responsible for sending messages to L2 to their corresponding contract in L2 or consuming messages from L2 to L1. [This](https://github.com/AztecProtocol/aztec-packages/blob/master/l1-contracts/test/portals/TokenPortal.sol) is an example of a TokenPortal that is responsible for bridging tokens between L1 and Aztec.

A portal creates a message and sends to the `Inbox` contract which is picked up by the sequencer and it adds the messages to Aztec's merkle trees. 

The corresponding L2 contract (the `l2Actor`) can now consume this message by fetching it from the merkle tree.

More information can be found at:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/concepts/foundation/communication/cross_chain_calls

5. L2 to L1 message passing
Similar to above, the `l2Actor` can create a L2 to L1 message, which the rollup contract eventualls adds to the outbox queue. At a later time, the `l1Actor` (the portal) can consume this message from the `Outbox`.

More information can be found at:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/concepts/foundation/communication/cross_chain_calls


### Unconstrained functions

Unconstrained functions can be thought of as view functions from Solidity--they only return information from the contract storage or compute and return data without modifying contract storage.

## Contract dependencies

Before we can implement the functions, we need set up the contract storage, and create a few helper files. 


In `contracts/src`, create a new file called `token_interface.nr` which will implement the interface of the token we say in the [Standard Token Tutorial](../token-standard/README.md). The Token Bridge depends on the token to mint/burn tokens from L2. So we will only add those functions to our interface.

```rust
use dep::aztec::{
  context::{ PrivateContext, PublicContext, Context },
  oracle::compute_selector::compute_selector,
};

struct Token {
  address: Field,
}

impl Token {
  fn at(address: Field) -> Self {
    Self { address }
  }

  fn mint_public(self: Self, context: PublicContext, to: Field, amount: Field) {
    let _return_values = context.call_public_function(
      self.address,
      compute_selector("mint_public((Field),Field)"),
      [to, amount]
    );
  }

  fn burn_public(self: Self, context: PublicContext, from: Field, amount: Field, nonce: Field) {
    let _return_values = context.call_public_function(
      self.address,
      compute_selector("burn_public((Field),Field,Field)"),
      [from, amount, nonce]
    );
  }

  fn mint_private(self: Self, context: PublicContext, amount: Field, secret_hash: Field) {
    let _return_values = context.call_public_function(
      self.address,
      compute_selector("mint_private(Field,Field)"),
      [amount, secret_hash]
    );
  }

  fn burn(self: Self, context: &mut PrivateContext, from: Field, amount: Field, nonce: Field) {
    let _return_values = context.call_private_function(
      self.address,
      compute_selector("burn((Field),Field,Field)"),
      [from, amount, nonce]
    );
  }
}
```

Now in `main.nr`, just below the contract definition, add the following imports:

```rust
mod util;
mod token_interface;

// Minimal implementation of the token bridge that can move funds between L1 <> L2.
// The bridge has a corresponding Portal contract on L1 that it is attached to 
// And corresponds to a Token on L2 that uses the `AuthWit` accounts pattern.
// Bridge has to be set as a minter on the token before it can be used
contract TokenBridge {
    use dep::aztec::{
        context::{Context},
        state_vars::{public_state::PublicState},
        types::type_serialisation::field_serialisation::{
            FieldSerialisationMethods, FIELD_SERIALISED_LEN,
        },
        types::address::{AztecAddress, EthereumAddress},
        oracle::compute_selector::compute_selector,
    };

    use crate::token_interface::Token;
    use crate::util::{get_mint_public_content_hash, get_mint_private_content_hash, get_withdraw_content_hash, compute_secret_hash};
```

We are importing the Context type which lets us create public or private contexts (for public/private methods that the token bridge will have), `state_vars` for helping manage state, `types` for data manipulation and `oracle` for helping compute function selectors easily.

Now copy [`util.nr`](./contracts/src/util.nr) into `token_bridge_contract_tutorial/contracts/token_bridge_contract/src` as well. The function defined in `util.nr` will be helpful for generating message hashes that are used when communicating between contracts.

## Contract Storage

Now that we have dependencies imported into our contract we can define the storage for the contract.

Below the dependencies, paste the following Storage struct:

```rust
    // Storage structure, containing all storage, and specifying what slots they use.
    struct Storage {
        token: PublicState<Field, 1>,
    }
```

We just have 1 storage variable - `token` which is a Field element that stores the token that the bridge contract corresponds to. Note that `token` is stored in public state so it can be accessed and verified by anyone.

Read more about storage and state variables at 
- https://aztec-docs-dev.netlify.app/dev_docs/contracts/storage and 
- https://aztec-docs-dev.netlify.app/dev_docs/contracts/state_variables

### Initializing Storage

Once we have Storage defined, we need to specify how to initialize it. The `init` method creates and initializes an instance of `Storage`. We define an initialization method for each of the storage variables defined above. Storage initialization is generic and can largely be reused for similar types, across different contracts, but it is important to note that each storage variable specifies it's storage slot, starting at 1.

Also, the public storage variables define the type that they store by passing the methods by which they are serialized, so `FieldSerialisationMethods` in this case.

```rust
    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                token: PublicState::new(
                    context,
                    1,
                    FieldSerialisationMethods,
                ),
            }
        }
    }
```

## Functions

Copy and paste the body of each function into the appropriate place in your project if you are following along.

### Constructor

In the source code, the constructor logic is commented out.
```rust
   // Constructs the contract.
    #[aztec(private)]
    fn constructor(/*token: AztecAddress*/) {
        // Currently not possible to execute public calls from constructor as code not yet available to sequencer.
        // let selector = compute_selector("_initialize((Field))");
        // let _callStackItem = context.call_public_function(context.this_address(), selector, [token]);
    }
```

The constructor is a private function. There isn't any private state to set up in this function, but there is public state to set up - the token! it isn't possible to call a public function from the constructor yet so we can't manipulate the public state from the constructor yet. But if it were:

The `context` is a global variable that is available to private and public functions, but the available methods differ based on the context. You can see the details [here](https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/aztec-nr/aztec/src/context.nr). The `context.call_public_function` allows a private function to call a public function on any contract. In this case, the constructor is passing the `token` as the argument to the `_initialize` function, which is also defined in this contract.

### Public function implementations

Public functions are declared with the `#[aztec(public)]` macro above the function name like so:

```rust
    #[aztec(public)]
    fn set_admin(
        new_admin: AztecAddress,
```

As described in the [execution contexts section above](#execution-contexts), public function logic and transaction information is transparent to the world. Public functions update public state, but can be used to prepare data to be used in a private context.

Every public function initializes storage using the public context like so:

```rust
let storage = Storage::init(Context::public(&mut context));
```

After this, storage is referenced as `storage.variable`. We won't go over this step in any of the following function descriptions.

#### `claim_public`
Assuming someone has already created a L1->L2 message to deposit their L1 tokens into L2 by calling `TokenPortal.depositToAztecPublic()`, (ref [here](https://github.com/AztecProtocol/aztec-packages/blob/master/l1-contracts/test/portals/TokenPortal.sol)), it can now be consumed on Aztec

The claim_public function enables anyone to consume the message on the user's behalf and mint tokens for them on L2!

It first recomputes the L1->L2 message content by calling `utils.get_mint_public_content_hash()`. Note that the method does exactly the same as what TokenPortal did in `depositToAztecPublic()` to create the message.content variable.

It then attempts to consume the L1->L2 message by massing the messageKey (ID of the message), the content hash, the "secret". Since we are depositing to Aztec publicly, this secret is public, anyone can know this and is usually 0. `context.consume_l1_to_l2_message()` takes in the contentHash and secret to recreat the original message the token portal created, then hashes it to ensure it is the same as the provided msgKey and that this message exists on the merkle tree and hasn't been nullified yet. After consuming the message, this method also emits a nullifier thus preventing anyone from trying to consume this message again.

Note that the `contentHash` requires `to`, `amount` and `canceller`. If a malicious user tries to mint tokens to their address by changing the `to` address, the content hash will be different to what the token portal had calculated on L1 and the messageKey will also be different, thus preventing the L1->L2 message from being consumed. 

Read more here:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/dev_docs/contracts/portals/main#passing-data-to-the-rollup

Then we call `token.mint()` to mint the tokens to the `to` address. Refer to [mint_public function on the token contract](../token-standard/README.md#mint_public)

```rust
    // Consumes a L1->L2 message and calls the token contract to mint the appropriate amount publicly
    #[aztec(public)]
    fn claim_public(
        to: AztecAddress,
        amount: Field,
        canceller: EthereumAddress,
        msg_key: Field,
        secret: Field,
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));

        let content_hash = get_mint_public_content_hash(to.address, amount, canceller.address);
        // Consume message and emit nullifier
        context.consume_l1_to_l2_message(msg_key, content_hash, secret);

        // Mint tokens 
        Token::at(storage.token.read()).mint_public(context, to.address, amount);

        1
    }
```

#### `exit_to_l1_public`

The `exit_to_l1_public` function enables anyone to withdraw their L2 tokens back to L1 publicly. This is done by burning tokens on L2 and then creating an l2->l1 message.

It first sends an L2->L1 withdrawal message by calling context.message_portal() and passing the content hash. The content hash is computed by calling `utils.get_withdraw_content_hash()`, doing the same computation the `TokenPortal.withdraw()` contract does when processing withdrawals.

This content hash requires the L1 recipient address, amount and the callerOnL1 allowed to call the withdrawal on L1. If a malicious user tries to withdraw to a different address, the content hash won't match what the portal expects. This prevents anyone else from front-running you to consume the message on L1.

Read more here:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/dev_docs/contracts/portals/main#passing-data-to-l1

Finally, it burns the specified token amount from the caller by invoking the public burn method on the token contract. We follow the check-effects-interaction pattern to avoid re-entrancy by placing this method at the bottom of the function logic.

Note that the caller has to first approve the bridge contract to burn tokens on its behalf. Refer to [burn_public function on the token contract](../token-standard/README.md#burn_public). The `nonce` parameter refers to the approval message that the user creates - also refer to [here](../token-standard/README.md#authorizing-token-spends).

```rust
    // Burns the appropriate amount of tokens and creates a L2 to L1 withdraw message publicly
    // Requires `msg.sender` to give approval to the bridge to burn tokens on their behalf using witness signatures 
    #[aztec(public)]
    fn exit_to_l1_public(
        recipient: EthereumAddress, // ethereum address to withdraw to
        amount: Field,
        callerOnL1: EthereumAddress, // ethereum address that can call this function on the L1 portal (0x0 if anyone can call)
        nonce: Field, // nonce used in the approval message by `msg.sender` to let bridge burn their tokens on L2
    ) -> Field {
        let storage = Storage::init(Context::public(&mut context));

        // Send an L2 to L1 message
        let content = get_withdraw_content_hash(recipient.address, amount, callerOnL1.address);
        context.message_portal(content);     

        // Burn tokens 
        Token::at(storage.token.read()).burn_public(context, context.msg_sender(), amount, nonce);
   
        1
    }
```

### Private function implementations

#### `claim_private`
Like with [`claim-public`](#claim_public), assuming someone has already created a L1->L2 message to deposit their L1 tokens into L2 by calling `TokenPortal.depositToAztecPrivate()`, (ref [here](https://github.com/AztecProtocol/aztec-packages/blob/master/l1-contracts/test/portals/TokenPortal.sol)), it can now be consumed on Aztec.

The claim_private function enables anyone to help deposit a user's L1 tokens into their L2 account privately, as long as they know the `secret` used for L1->L2 message creation. After consumption, the relevant amount can be minted and the user (that knows the secret corresponding to `secret_hash_for_redeeming_minted_notes`) can claim the notes by calling `token.redeem_shield()`.

The function first consumes the L1->L2 message by recomputing the content hash using `utils.get_mint_private_content_hash()`. This content hash requires the mint amount, the secret_hash (for redeeming minted notes), and the canceller address. 

claim_private then calls context.consume_l1_to_l2_message(), passing the message key, content hash, and the secret(for the L1->L2 message) provided to consume the message. This verifies the message exists and emits a nullifier.

To mint tokens privately, claim_private calls an internal function [_call_mint_on_token()](#_call_mint_on_token) which then calls [token.mint_private()](../token-standard/README.md#mint_private) which is a public method since it operates on public storage.

This enables claim_private to mint tokens privately on behalf of a user by only knowing the secret hash. The user can later redeem the minted notes in their own private context by providing the original secret.

```rust
    // Consumes a L1->L2 message and calls the token contract to mint the appropriate amount in private assets
    // User needs to call token.redeem_shield() to get the private assets
    #[aztec(private)]
    fn claim_private(
        amount: Field,
        secret_hash_for_redeeming_minted_notes: Field, // secret hash used to redeem minted notes at a later time. This enables anyone to call this function and mint tokens to a user on their behalf
        canceller: EthereumAddress,
        msg_key: Field, // L1 to L2 message key as derived from the inbox contract
        secret_for_L1_to_L2_message_consumption: Field, // secret used to consume the L1 to L2 message
    ) -> Field {
        // Consume L1 to L2 message and emit nullifier
        let content_hash = get_mint_private_content_hash(amount, secret_hash_for_redeeming_minted_notes, canceller.address);
        context.consume_l1_to_l2_message(msg_key, content_hash, secret_for_L1_to_L2_message_consumption);

        // Mint tokens on L2 
        // `mint_private` on token is public. So we call an internal public function 
        // which then calls the public method on the token contract.
        // Since the secret_hash is passed, no secret is leaked. 
        context.call_public_function(
            context.this_address(),
            compute_selector("_call_mint_on_token(Field,Field)"),
            [amount, secret_hash_for_redeeming_minted_notes],
        );

        1
    }
```

#### `exit_to_l1_private`

The `exit_to_l1_private` function enables anyone to withdraw their L2 tokens back to L1 privately. This is done by burning tokens on L2 and then creating an l2->l1 message.

It first sends an L2->L1 withdrawal message by calling context.message_portal() and passing a content hash. This content hash is computed using `utils.get_withdraw_content_hash()` ,doing the same computation the `TokenPortal.withdraw()` contract does when processing withdrawals.

The content hash requires the L1 recipient address, amount, and callerOnL1. This prevents front-running attacks when the message is consumed on L1.

Read more here:
<!-- TODO: update link -->
https://aztec-docs-dev.netlify.app/dev_docs/contracts/portals/main#passing-data-to-l1

Since this is a private method, it can't read what token is publicly stored, so instead the user passes a token address, and `_assert_token_is_same()` checks that this user provided address is same as the one in storage.

Next, we call the [`burn()` method on the token](../token-standard/README.md#burn). Before this, the user must sign an approval message to let the contract burn tokens on their behalf. The nonce refers to this approval message. Read more [here](../token-standard/README.md#authorizing-token-spends).


```rust
    // Burns the appropriate amount of tokens and creates a L2 to L1 withdraw message privately
    // Requires `msg.sender` (caller of the method) to give approval to the bridge to burn tokens on their behalf using witness signatures 
    #[aztec(private)]
    fn exit_to_l1_private(
        recipient: EthereumAddress, // ethereum address to withdraw to
        token: AztecAddress,
        amount: Field,
        callerOnL1: EthereumAddress, // ethereum address that can call this function on the L1 portal (0x0 if anyone can call)
        nonce: Field, // nonce used in the approval message by `msg.sender` to let bridge burn their tokens on L2
    ) -> Field {
        // Send an L2 to L1 message
        let content = get_withdraw_content_hash(recipient.address, amount, callerOnL1.address);
        context.message_portal(content);

        // Assert that user provided token address is same as seen in storage. 
        context.call_public_function(context.this_address(), compute_selector("_assert_token_is_same(Field)"), [token.address]);

        // Burn tokens
        Token::at(token.address).burn(&mut context, context.msg_sender(), amount, nonce);

        1
    }
```

### Internal function implementations

Internal functions are functions that can only be called by this contract. The following 3 functions are public functions that are called from the [private execution context](#execution-contexts). Marking these as `internal` ensures that only the desired private functions in this contract are able to call them. Private functions defer execution to public functions because private functions cannot update public state directly.

#### `_initialize`

This function is called via the [constructor](#constructor). Note that it is not actually marked `internal` right now due to limitations in the constructor, so as a hack we directly call this.

This function takes in a `token` address and sets the storage appropriately. 

```rust
    // We cannot do this from the constructor currently 
    // Since this should be internal, for now, we ignore the safety checks of it, as they are 
    // enforced by it being internal and only called from the constructor.
    #[aztec(public)]
    fn _initialize(token: AztecAddress) {
        let storage = Storage::init(Context::public(&mut context));
        storage.token.write(token.address);
    }
```

#### `_call_mint_on_token`

This function is called from [`claim_private`](#claim_private). Since claim_private is a private method, it can't read `token` from public storage. So it calls this internal method which calls the public mint_private method on the token. 

Note that mint_private (on token) is public because it too reads from public storage. Since the secret_hash_for_redeeming_minted_notes is passed publicly (and not the secret), nothing that should be leaked is, and the only the person that knows the secret can actually redeem their notes at a later time by calling `Token.redeem_shield()`


```rust
    // This is a public call as we need to read from public storage.
    // Also, note that user hashes their secret in private and only sends the hash in public
    // meaning only user can `redeem_shield` at a later time with their secret.
    #[aztec(public)]
    internal fn _call_mint_on_token(amount: Field, secret_hash: Field){
        let storage = Storage::init(Context::public(&mut context));
        Token::at(storage.token.read()).mint_private(context, amount, secret_hash);
    }

```

#### `_assert_token_is_same`

This function is called from [`exit_to_l1_private`](#exit_to_l1_private). Because it was a private method, it can't access public storage and therefore can't know what the token address is that is stored. So in `exit_to_l1_private()`, user passes the token address and it calls this public internal method that ensures that the token provided by the user is same as seen in storage

```rust
    #[aztec(public)]
    internal fn _assert_token_is_same(token: Field) {
        let storage = Storage::init(Context::public(&mut context));
        assert(storage.token.read() == token, "Token address is not the same as seen in storage");
    }
```

### Unconstrained function implementations

Unconstrained functions are similar to `view` functions in Solidity in that they only return information from the contract storage or compute and return data without modifying contract storage.

#### `token`

A getter function for reading the public `token` value.

```rust
    unconstrained fn token() -> Field {
        let storage = Storage::init(Context::none());
        storage.token.read()
    }
```

## Testing

End to end tests for reference:

* https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/end-to-end/src/e2e_public_cross_chain_messaging.test.ts
* https://github.com/AztecProtocol/aztec-packages/blob/master/yarn-project/end-to-end/src/e2e_cross_chain_messaging.test.ts
