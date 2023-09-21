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
    fn constructor(initial_counter: u120, owner: Field) {
        let storage = Storage::init(Context::private(&mut context));
        let counts = storage.counts;
        counts.at(owner).add(initial_counter, owner)
    }
    
    #[aztec(private)]
    fn increment(owner: Field) {
        let storage = Storage::init(Context::private(&mut context));
        let counts = storage.counts;
        counts.at(owner).add(1, owner)
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