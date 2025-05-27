# Deploy the Counter contract with access control

Additional notes in the hackmd [here](https://hackmd.io/WyJlswYJTEmWFjEolGNiww).

The `master` branch is the third step, most complete branch of the workshop.

Check out `0-blank-signerless` for the first, simplest step and `1-counter-signerless` for the second step on [this github repo](https://github.com/critesjosh/aztec-account-abstraction-workshop/).

## Setup

1. Make sure the sandbox is running.
2. Install dependencies with `yarn`
3. Run with `yarn start`

This is a bit more complex than the Blank contract because this contract has state, and allows users to update state.

State is encrypted notes that are owned by accounts and can be decrypted with the account's public key.

These interactions are still not coming from an account contract. `msg_sender` is still the 0 address.

## Counter.nr

### Imports

- Context
- Note
- Option

#### State management

- Map
- Singleton

#### Oracle

- Debugging

#### Notes

- ValueNote
- FieldNote
- EasyPrivateUint (note management)

### Storage

- `secret`
  - For access control
  - Provide the secret and execute functions
- `counters`
  - Stores a count, privately

### Functions

#### Constructor

Initialize a private, `secret` value (in a FieldNote Singleton) that must be provided when calling `increment` or `update_secret`

The last argument in the `initialize` function indicates whether to broadcast a note. This is not implemented for FieldNotes, so must be manually added to the PXE in index.ts.

#### Increment

- Same logic as the base counter, but requires that the caller provide the `secret` value

#### Update Secret

Change the secret saved in storage (currently WIP). There is a bug in the PXE where old values are not nullified, so the Typescript isn't working as expected, but the code is there.

This function shows how to use logging for debugging in Aztec contracts.

#### Get Secret

Return the currently saved secret. This does not send a tx to the network, just decrypts and reads from local state, similar to a Solidity `view` function.

#### Get Counter

Return the current count (sum of value notes in the set).

#### Compute note hash and nullifier

This function is required by the protocol to know how to handle private notes.

## index.ts

1. Setup
2. Deploy
3. Add note
4. Increment Counter
5. Show failing cases (commented out)
6. Read count

## Future work

- Implement signature verification
- Discuss [Authentication witnesses](https://docs.aztec.network/aztec/concepts/accounts/authwit)
- Review the existing Schnorr signer [implementation](https://github.com/AztecProtocol/aztec-packages/tree/master/noir-projects/noir-contracts/contracts/account/schnorr_account_contract)
