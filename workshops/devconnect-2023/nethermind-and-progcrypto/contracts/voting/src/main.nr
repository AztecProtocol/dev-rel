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

struct Storage {
    admin: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
    tally: Map<PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>>,
    voteEnded: PublicState<bool, BOOL_SERIALIZED_LEN>, }

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

    #[aztec(private)] 
    fn constructor(admin: AztecAddress) {
        context.call_public_function(
            context.this_address(),
            compute_selector("set_admin((Field))"), 
            [admin.address]);
    }

    #[aztec(public)] 
    fn set_admin(admin: AztecAddress) {
	    storage.admin.write(admin); 
        storage.voteEnded.write(false);
    }

    struct OneUseOnly {
	    user: AztecAddress
    }

    impl OneUseOnly {
	    pub fn new(user: AztecAddress) -> Self {
	        Self { user }
	}

	fn spend_private(self, context: &mut PrivateContext) {
	    let user = self.user.address; 
        let slot = 69; 
        let nullifier = dep::std::hash::pedersen_hash([user, slot]);
	    context.push_new_nullifier(nullifier, 0);
	    }
    }

    #[aztec(private)]
    fn cast_vote(owner: Field, vote: Field)  {
        context.call_public_function(
	        context.this_address(),
	        compute_selector("add_to_tally_public(Field)"), 
            [vote],
	   );


	let user_nullifier = OneUseOnly::new(AztecAddress::new(context.msg_sender()));
	user_nullifier.spend_private(&mut context);
    }

    #[aztec(public)] 
    fn add_to_tally_public(vote: Field) {
        assert(storage.voteEnded.read()==false, "Vote has ended");
        let amount = SafeU120::new(1); let new_tally =
        storage.tally.at(vote).read().add(amount);
        storage.tally.at(vote).write(new_tally);
     }

    #[aztec(public)] 
    fn end_vote() {
        assert(storage.admin.read().eq(AztecAddress::new(context.msg_sender())),
            "Only admin can end votes");
        storage.voteEnded.write(true);
    }

    unconstrained fn get_vote(vote: Field) -> u120 {
	    storage.tally.at(vote).read().value
    }

    unconstrained fn compute_note_hash_and_nullifier( contract_address:
        Field, nonce: Field, storage_slot: Field, preimage: [Field;
        VALUE_NOTE_LEN], ) -> [Field; 4] { let note_header =
        NoteHeader::new(contract_address, nonce, storage_slot);
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods,
        note_header, preimage)
    }

}