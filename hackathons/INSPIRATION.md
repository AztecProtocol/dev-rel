# Inspiration

Here you will find some use cases and ideas that we’d love to see people building on Aztec and Noir. The use cases are endless and not limited to this list!

If you are interested in building on Aztec in a hackathon, check out the [Hackathon success guide 💻](../README.md#hackathon-success-guide-) at the bottom of this file so you can improve your chances of winning a prize.

## DeFi 💸

The lack of privacy is consistently brought up as one of the main reasons we are yet to see mass onboarding to crypto and DeFi. There are so many opportunities within the DeFi space to implement privacy measures, especially in user-friendly ways.

### Ideas

These projects would be implemented as, or in conjunction with, Aztec contracts:

- **ZK Uniswap frontend -** develop a frontend for our uniswap smart contract found [here](https://github.com/AztecProtocol/aztec-packages/tree/master/noir-projects/noir-contracts/contracts/uniswap_contract)
- **ZK stablecoin** - build a stablecoin that allows you to wrap a stablecoin so it can be privately transferred
- **Private lending front end** - you can see an example [here](https://github.com/AztecProtocol/aztec-packages/tree/master/noir-projects/noir-contracts/contracts/lending_contract)
- **ZKollateral** - privately prove assets for collateral or creditworthiness for a loan
- **Proof of Liquidity** - privately prove solvency and/or compliance without exposing the underlying assets or trades
- **Private DEX** - allows users to trade assets without revealing the accounts that the assets originate from.
- **Oracles** - private and/or public price oracles will be critical infrastructure for building DeFi on Aztec.

## Tooling 🔧

Aztec and Noir are new protocols, so we’re always updating the developer tooling. There is a lot we can do here so don’t let these ideas limit you!

### Ideas

These projects could be done for Noir or Aztec contracts:

- **Boilerplates for more frameworks** - there are [Noir boilerplates](https://github.com/noir-lang/awesome-noir#boilerplates) and [Aztec boilerplates](https://github.com/AztecProtocol/aztec-packages/tree/master/boxes) for a number of popular frameworks already. Consider creating one for your favorite framework if there isn't one yet.

These projects would be specific to Noir:

- **Noir Foundry Integration Tests** - setting up integration tests in Foundry using [ffi](https://book.getfoundry.sh/cheatcodes/ffi) is tricky, but may be necessary because of the lack of ZK friendly cryptographic libraries in Solidity. Adding boilerplate code and a simple example of this to [`with-foundry`](https://github.com/noir-lang/noir-starter/tree/main/with-foundry) in the noir-starter repo would be useful.

### Proving backends

Noir does not compile to a specific proof system, so you can implement an entirely different proving system such as Halo2 or Marlin. You can see what is being worked on [here](https://github.com/noir-lang/awesome-noir#proving-backends).

### Verifiers

The default UltraPlonk proving backend of Noir, [barretenberg](https://github.com/AztecProtocol/barretenberg), is currently capable of generating verifiers in [C++](https://github.com/noir-lang/aztec-connect/blob/kw/noir-dsl/barretenberg/src/aztec/plonk/proof_system/verifier/verifier.cpp) and [Solidity](https://github.com/noir-lang/acvm-backend-barretenberg/blob/master/src/smart_contract.rs). You could extend barretenberg to generate verifiers implementable on other execution environments like Solana, Cosmos, Aptos, Sui, NEAR, Algorand, etc.

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
- **zkEmail** - privately prove that some email was received, while hiding any private data in the e-mail, without trusting a centralized server to keep your privacy. You can use [this library](https://github.com/zkemail/zkemail.nr).
- **Privacy Preserving Rewards Protocol** - an app or protocol that rewards participants for doing a specific on-chain action without revealing how much. This [tutorial](https://docs.aztec.network/developers/tutorials/codealong/contract_tutorials/crowdfunding_contract) may be helpful.

## Gaming 👾

### Ideas

You could try to implement these in vanilla Noir, or as Aztec contracts.

- **Poker**
- **Chess**
- **Scrabble**
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

Check the [awesome-noir repo](https://github.com/noir-lang/awesome-noir) for the latest complete list.
