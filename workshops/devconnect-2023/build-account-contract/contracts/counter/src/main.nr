contract Counter {

    /*
        Imports
    */

    use dep::aztec::{
        context::{PrivateContext, Context},
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        state_vars::{
            map::Map,
            singleton::Singleton,
        },
        oracle::debug_log::{
            debug_log,
            debug_log_field,
            debug_log_format
        }
    };
    use dep::value_note::{
            balance_utils,
            value_note::{
                ValueNoteMethods,
                VALUE_NOTE_LEN,
            },
    };
    use dep::field_note::field_note::{
        FieldNote,
        FieldNoteMethods,
        FIELD_NOTE_LEN
    };
    use dep::easy_private_state::easy_private_state::EasyPrivateUint;
    use dep::std::option::Option;

    /*
        Storage declaration
    */

    struct Storage {
        // Whoever can produce this secret is able to 
        secret: Singleton<FieldNote, FIELD_NOTE_LEN>,
        counters: Map<EasyPrivateUint>,
    }

    impl Storage {
        fn init(context: Context) -> Self {
            Storage {
                secret: Singleton::new(context, 1, FieldNoteMethods),
                counters: Map::new(
                    context,
                    2,
                    |context, slot| {
                        EasyPrivateUint::new(context, slot)
                    },
                ),
            }
        }
    }

    #[aztec(private)]
    fn constructor(secret: Field) {
        let mut note = FieldNote::new(secret);
        storage.secret.initialize(
            &mut note,
            Option::some(context.this_address()), // owner of the note, this is `this` bc the contract is being used as an "account"
            false
        );
    }

    #[aztec(private)]
    fn increment(owner: Field, secret: Field)  {
        let secret_note = storage.secret.get_note(false);
        assert(secret_note.value == secret);
        let counters = storage.counters;
        counters.at(owner).add(1, owner);
    }

    #[aztec(private)]
    fn update_secret(secret: Field, new_secret: Field) {
        assert(storage.secret.get_note(false).value == secret);
        let mut note = FieldNote::new(new_secret);
        storage.secret.replace(&mut note, false);
        debug_log_format("secret: {0}, newSecret: {1}", [secret, new_secret]);
    }

    unconstrained fn get_secret() -> Field {
        let secret_note = storage.secret.view_note();
        debug_log_format("secret: {0}", [secret_note.value]);
        secret_note.value
    }

    unconstrained fn get_counter(owner: Field) -> Field {
        let counters = storage.counters;
        balance_utils::get_balance(counters.at(owner).set)
    }

    /*
        Required functions, only modified for custom note types
    */

    unconstrained fn compute_note_hash_and_nullifier(
        contract_address: Field,
        nonce: Field,
        storage_slot: Field,
        preimage: [Field; VALUE_NOTE_LEN],
    ) -> [Field; 4] {
        let note_header = NoteHeader::new(contract_address, nonce, storage_slot);
        if (storage_slot == 1) {
            note_utils::compute_note_hash_and_nullifier(FieldNoteMethods, note_header, preimage)
        } else {
            note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
        }
    }
}