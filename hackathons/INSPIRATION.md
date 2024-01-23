# Inspiration

Here you will find some use cases and ideas that we’d love to see people building on Aztec and Noir. The use cases are endless and not limited to this list!

If you are interested in building on Aztec in a hackathon, check out the [Hackathon success guide 💻](../README.md#hackathon-success-guide-) at the bottom of this file so you can improve your chances of winning a prize.

## DeFi 💸

The lack of privacy is consistently brought up as one of the main reasons we are yet to see mass onboarding to crypto and DeFi. There are so many opportunities within the DeFi space to implement privacy measures, especially in user-friendly ways.

### Ideas

These projects would be implemented as, or in conjunction with, Aztec contracts:

- **ZK UniSwap frontend -** develop a frontend for our uniswap smart contract found [here](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/noir-contracts/contracts/uniswap_contract)
- **Shielding** - an app that allows users to convert public tokens into a private form, perform an action, and then unshield back into original token. This could build on the existing token contract implementation, see the [tutorial here](https://docs.aztec.network/dev_docs/tutorials/writing_token_contract).
- **ZK stablecoin** - build a stablecoin that allows you to wrap a stablecoin so it can be privately transferred 
- **Private lending front end** - you can see an example [here](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/noir-contracts/contracts/lending_contract)
- **ZKollateral** - privately prove assets for collateral or creditworthiness for a loan
- **Proof of Liquidity** - privately prove solvency and/or compliance without exposing the underlying assets or trades
- **Private DEX** - allow users to trade assets without revealing the accounts that the assets originate from.
- **Oracles** - private and/or public price oracles will be critical infrastructure for building DeFi on Aztec.

## Tooling 🔧

Aztec and Noir are new protocols, so we’re always updating the developer tooling. There is a lot we can do here so don’t let these ideas limit you!

### Ideas

These projects would be implemented for Noir, but could be used for Aztec contracts as well:

- **IDE language support** - we have some support with VSCode but would love to expand this through IDE features like auto-complete, hover for documentation, go-to function definition/references, etc. You can find our Language Server protocol [here](https://noir-lang.org/docs/nargo/language_server/)
- **Ethereum History API** - trustlessly and optionally privately prove any piece of information that exists on Ethereum (e.g. token ownership, historical prices, protocol interactions, etc.) using Ethereum Storage Proofs in Noir - find example [here](https://github.com/Maddiaa0/noir-storage-proofs-demo)
- **Regex support in Noir** - regular expression (regex) in Noir that provides a mechanism to perform searches, manipulations, and evaluations using regex patterns within the language; more info [here](https://speakerdeck.com/sorasuegami/ethcon-korea-2023-zk-email-on-chain-verification-of-emails-using-zkp)
- **Hash Maps in Noir** - incorporate hash maps into Noir to allow devs to store and manipulate key-value pairs more efficiently

These projects could be done for Noir or Aztec contracts:

- **Boilerplates for more frameworks** - there are [Noir boilerplates](https://github.com/noir-lang/awesome-noir#boilerplates) and [Aztec boilerplates](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/boxes) for a number of popular frameworks already. Consider creating one for your favorite framework if there isn't one yet.

These projects would be specific to Noir:

- **Noir Foundry Integration Tests** - setting up integration tests in Foundry using [ffi](https://book.getfoundry.sh/cheatcodes/ffi) is tricky, but may be necessary because of the lack of ZK friendly cryptographic libraries in Solidity. Adding boilerplate code and a simple example of this to [`with-foundry`](https://github.com/noir-lang/noir-starter/tree/main/with-foundry) in the noir-starter repo would be useful.

### Proving backends

Noir does not compile to a specific proof system, so you can implement an entirely different proving system such as Halo2 or Marlin.

### Verifiers

The default UltraPlonk proving backend of Noir, [barretenberg](https://github.com/AztecProtocol/barretenberg), is currently capable of generating verifiers in [C++](https://github.com/noir-lang/aztec-connect/blob/kw/noir-dsl/barretenberg/src/aztec/plonk/proof_system/verifier/verifier.cpp) and [Solidity](https://github.com/noir-lang/aztec_backend/blob/master/common/src/contract/turbo_verifier.rs). You could extend barretenberg to generate verifiers implementable on other execution environments like Solana, Cosmos, Aptos, Sui, NEAR, Algorand, etc.

This is only relevant for Noir specifically (not Aztec).

## DAOs 🤝

Imagine if DAOs could take privacy-preserving measures like anonymous voting and confidential proposal submission.

### Ideas

You could try to implement these in vanilla Noir, or as Aztec contracts.

- **zkVoting** - a protocol that anyone can easily implement into their DAO for privacy-preserving voting
- **Private payments / payroll -** a system that allows DAOs to pay their contributors without revealing the amounts. This would greatly improve the UX and privacy of contributors.

## Data Protecting Proof of Concepts 🔓

We’re always looking to support applications that utilize privacy and ZK proofs in interesting and useful ways.

### Ideas

You could try to implement these in vanilla Noir, or as Aztec contracts.

- **zkPatreon** - privately unlock token-gated content by using Ethereum Storage Proofs in Noir
- **zkEmail** - privately prove that some email was received, while hiding any private data in the e-mail, without trusting a centralized server to keep your privacy. Inspired by this [great blog post](https://blog.aayushg.com/posts/zkemail)
- **Privacy Preserving Rewards Protocol** - an app or protocol that rewards participants for doing a specific on-chain action without revealing how much

## Gaming 👾

### Ideas

You could try to implement these in vanilla Noir, or as Aztec contracts.

- **ZK Poker**
- **ZK Chess**
- **ZK Scrabble**
- **ZK Quests** - players can prove they have achieved a specific action or quest within a game without revealing the quest, preventing spoilers
- **ZK Treasure Hunt** - irl experience that validates a user has found a clue/treasure without revealing their location to other players

## Identity 🕴️

Being able to have a private identity on the blockchain will become increasingly important as more & more use-cases come on chain.

### Ideas

Relevant for Aztec contracts or Noir:

- **Privacy-preserving KYC protocol**

Relevant for Aztec specifically:

- **Private Account Abstraction Wallet using Touch or Face ID** - user logs in with TouchID/FaceID using AA, and zk proofs are generated to confirm that correct biometric data has been provided

---

## Cool Noir projects

A curated list of existing projects building with Noir

### Authentication

- Anonymous proof of token ownership on Aztec for token-gated access
  - [Sequi](https://github.com/sequi-xyz)
  - [Cyclone](https://github.com/TalDerei/cyclone)
- [SafeRecover](https://github.com/porco-rosso-j/safe-recovery-noir) - Recovery of ownership of Gnosis Safe accounts

### Gaming

- [Mastermind](https://github.com/vezenovm/mastermind-noir) - Mastermind in Noir
- [BattleZips](https://battlezips.com/) ([Source Code](https://github.com/BattleZips/BattleZips-Noir)) - On-chain Battleship
- [Sudoku, Wordle, and Trivia](https://github.com/ruizehung/Zero-Knowledge-Sudoku-Wordle-Trivia) - Sudoku, Wordle, and Trivia games
- [ZCaptcha](https://github.com/signorecello/zcaptcha) - A ZK version of Captcha
- [Hangman](https://github.com/resurgencelabs/hangman) - Simple implementation of the Hangman game

### Governance

- [MeloCafe](https://github.com/MeloCafe) - Anonymous on-chain voting
- [Nouns Research Sprint](https://github.com/aragonzkresearch/nouns-anonymous-voting) - Anonymous voting research sprint solution with NounsDAO

### Social

- [FruityFriends](https://github.com/guelowrd/fruity-lib) - Various circuits (Proof of Intersection, Proof of Proximity, Proof of Proper Secret) to be used in social applications

### Payments

- [Private token](https://github.com/jat9292/Private-token) - Token with private balances using zkSNARKs and Homomorphic Encryption, inspired by Zeestar and Zether, implemented in Noir (and Rust).
