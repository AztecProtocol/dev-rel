# Nethermind Summit & ProgCrypto @ Devconnect 2023 

In this workshop, we developed the simplest possible private voting smart contract in Aztec.nr from scratch. We used both public and private state, and discussed how someone would implement this smart contract on Ethereum - allowing people to privately vote on Ethereum.

* [Full workshop code](https://github.com/catmcgee/aztec-voting-workshop/tree/main)
* [Slides](https://docs.google.com/presentation/d/1tZmCYH_rk2MQZ-JnIjB2gFy3015P5iDVMJ2MT84R9lQ/edit?usp=sharing)
* [Aztec docs](https://docs.aztec.network)
* [Portal docs](https://docs.aztec.network/concepts/foundation/communication/cross_chain_calls)

# Installing Sandbox
## Using Docker
```bash
/bin/bash -c "$(curl -fsSL 'https://sandbox.aztec.network')"
```
## Using npm
```bash
npx @aztec/aztec-sandbox
```
When installing with npm, you will need to run a node separately on port 8545. You can use anvil or hardhat or your choice.

# Installing Nargo 

```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup -v v0.18.0-aztec.5
```

# Installing CLI
```bash
npm install -g @aztec/cli
```

# Nargo.toml
```
[package]
name = "voting"
type = "contract"
authors = [""]
compiler_version = ">=0.18.0"

[dependencies]
aztec = { git = "https://github.com/AztecProtocol/aztec-nr", tag = "master" , directory = "aztec" }
value_note = { git = "https://github.com/AztecProtocol/aztec-nr", tag = "master" , directory = "value-note" }
safe_math = { git="https://github.com/AztecProtocol/aztec-nr", tag="master", directory="safe-math" }
```
# Aztec.nr contract code

## Imports
We copied & pasted this in the workshop - you can find more information into what these are in the [repo](https://docs.google.com/presentation/d/1tZmCYH_rk2MQZ-JnIjB2gFy3015P5iDVMJ2MT84R9lQ/edit?usp=sharing).

```rust
mod types; 
contract Voting {
    use dep::aztec::{
	context::{PrivateContext, Context}, note::{
	    note_header::NoteHeader, utils as note_utils,
	}, selector::compute_selector,
	 state_vars::{
	    map::Map, public_state::PublicState, singleton::Singleton,
	}, types::type_serialization::{
	    bool_serialization::{BoolSerializationMethods,
	    BOOL_SERIALIZED_LEN},
	    aztec_address_serialization::{AztecAddressSerializationMethods,
	    AZTEC_ADDRESS_SERIALIZED_LEN},
	}, types::address::{AztecAddress}, hash::pedersen_hash,

    }; 
    use dep::value_note::{
	    balance_utils, value_note::{
		ValueNote, ValueNoteMethods, VALUE_NOTE_LEN,
	    },
    }; 
    use dep::safe_math::SafeU120; 

    use crate::types::{SafeU120SerializationMethods, SAFE_U120_SERIALIZED_LEN};
```

## impl Storage block
```rust
 impl Storage {
	fn init(context: Context) -> Self {
	    Storage {
		 admin: PublicState::new(
		    context, 
            1, 
            AztecAddressSerializationMethods,
		), 
        tally: Map::new(
		    context, 
            2, 
            |context, slot| {
			PublicState::new(
			    context,
                slot, 
                SafeU120SerializationMethods,
			)
		    },
		 ),
		  voteEnded: PublicState::new(
		    context, 
            3, 
            BoolSerializationMethods,
		)
	    } }
	}
```

## compute_note_hash_and_nullifier function
```rust
unconstrained fn compute_note_hash_and_nullifier( contract_address:
        Field, nonce: Field, storage_slot: Field, preimage: [Field;
        VALUE_NOTE_LEN], ) -> [Field; 4] { let note_header =
        NoteHeader::new(contract_address, nonce, storage_slot);
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods,
        note_header, preimage)
    }
```

## Full types.nr
```rust
use dep::aztec::types::type_serialization::TypeSerializationInterface;
use dep::safe_math::SafeU120;

global SAFE_U120_SERIALIZED_LEN: Field = 1;

pub fn deserializeU120(fields: [Field; SAFE_U120_SERIALIZED_LEN]) -> SafeU120 {
    SafeU120{value: fields[0] as u120}
}

pub fn serializeU120(value: SafeU120) -> [Field; SAFE_U120_SERIALIZED_LEN] {
    [value.value as Field]
}

global SafeU120SerializationMethods = TypeSerializationInterface {
    deserialize: deserializeU120,
    serialize: serializeU120,
};
```
# aztec-cli commands

### Compile

`aztec-cli compile .`

### Deploy

`aztec-cli deploy ./target/Voting.json --args <address>`

### Cast vote

`aztec-cli send cast_vote --args <sender> <1> -c ./target/Voting.json -ca <contract-address> --private-key <private-key>`

Try to do it twice

### Get vote

`aztec-cli call get_vote --args 1 -c ./target/Voting.json -ca <contract-address`
