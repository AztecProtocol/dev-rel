# Glossary and Nomenclature - General

## Aztec Labs
The company - aztec.network

## Aztec Protocol
Definition of a layer 2 network that rolls up to Ethereum. Includes how to execute public/private functions, verify proofs, and reaches consensus on shared state.

## Aztec Network
Computers on a network that adhere to the Aztec Protocol.

## Aztec Client Software
Software run on individual computers that adhere to the Aztec protocol.
(learn more from the Yellow Paper)

## Aztec (Public) Virtual Machine
Executes the public section of a transaction, and unconstrained functions.

## Private eXecution Environment (PXE)
Execute the private section of a transaction.

## Noir Language
A rust-like language to represent constraints for zero-knowledge circuits.

## Aztec Contract or Aztec Smart Contract
Definitions of public and private, state and functions. Public code is execute in Protocol's AVM, private code in PXE's ACVM.

## Aztec.nr (Framework/website)
Framework written in Noir to help with development of Aztec Contracts

## Abstract Circuit Intermediate Representation (ACIR)
Noir compiles to ACIR.

## Abstract Circuit Virtual Machine (ACVM)
Converts ACIR into compatible backend formats.

## Noir Compiler (`nargo`)
Prove, verify, generate solidity verifier, ...

## Aztec Compiler (`aztec-nargo`)
Interpret Noir, via ACIR.

## Aztec Sandbox (Tool suite)
Installed via `bash -i <(curl -s install.aztec.network)`
Includes `aztec-nargo`, `aztec-cli`, `aztec-sandbox`, ...

## Aztec Sandbox (Tool, `aztec-sandbox`)
Locally run an Aztec Client and an Ethereum Client that it rolls up to.

# Glossary and Nomenclature - Note specific terms

## "Preimage" (Note Hash context)
Note contents and additional data that is has been hashed into a Note Hash

## "Consume" (Note read)
Nullifying a note after reading it in a transaction.
