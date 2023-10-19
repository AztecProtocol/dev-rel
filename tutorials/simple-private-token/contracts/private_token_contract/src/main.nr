contract PrivateToken {
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
    
    #[aztec(private)]
    fn mint(
        amount: Field, 
        owner: Field
    )  {
        let storage = Storage::init(Context::private(&mut context));
        let owner_balance = storage.balances.at(owner);
        increment(owner_balance, amount, owner);
    }

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

    unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {
        let note_header = NoteHeader { contract_address, nonce, storage_slot };
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
    }

    unconstrained fn get_balance(owner: Field) -> Field {
        let context = Context::none();
        let storage = Storage::init(context);
        let owner_notes = storage.balances.at(owner);
        balance_utils::get_balance(owner_notes)
    }
}
