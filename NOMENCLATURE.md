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
Executes the public section of a transaction.

## Private eXecution Environment (PXE)
Locally execute the private section of a transaction, and unconstrained (read-only) functions.

## Noir Language
Noir is a Domain-Specific Language for SNARK proving systems developed by Aztec Labs. [noir-lang.org](https://noir-lang.org/)

## Smart Contracts on Aztec
Definitions of public/private state and functions. Public code is executed in the Protocol's AVM, private code executed in the local PXE.

## Aztec.nr (Framework/website)
Framework written in Noir to help with development of Aztec Contracts.

## Abstract Circuit Intermediate Representation (ACIR)
Noir compiles to ACIR.
ACIR bytecode is the compilation target of contract private functions. ACIR expresses arithmetic circuits and thus has no control flow. Control flow in regular functions is either unrolled (for loops) or flattened (by inlining and adding predicates), resulting in a single function with no control flow to be transformed to ACIR.

## Abstract Circuit Virtual Machine (ACVM)
Converts ACIR into compatible backend formats.

## Noir Compiler (`nargo`)
[Prove](https://noir-lang.org/docs/reference/nargo_commands#nargo-prove), [verify](https://noir-lang.org/docs/reference/nargo_commands#nargo-verify), [generate solidity verifier](https://noir-lang.org/docs/how_to/how-to-solidity-verifier/), ...

## Aztec Compiler (`aztec-nargo`)
Interpret Noir written as Aztec contracts, via ACIR.

## Aztec Sandbox (Tool suite)
Includes `aztec-nargo`, `aztec-cli`, `aztec-sandbox`, ...
[aztec.network/sandbox](https://aztec.network/sandbox/)

## Aztec Sandbox (Tool, `aztec-sandbox`)
Locally run an Aztec Client and an Ethereum Client that it rolls up to.

# Glossary and Nomenclature - Note specific terms

## "Preimage" (Note Hash context)
Note contents and additional data that is has been hashed into a Note Hash

## "Consume" (Note read)
Nullifying a note after reading it in a transaction.
