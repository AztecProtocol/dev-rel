# Inspiration

Here you will find some use cases and ideas that we’d love to see people building on Aztec and Noir. The use cases are endless and not limited to this list! 

If you are interested in building on Aztec in a hackathon, check out the [Hackathon success guide 💻](#hackathon-success-guide-) at the bottom of this file so you can improve your chances of winning a prize.

## DeFi 💸

The lack of privacy is consistently brought up as one of the main reasons we are yet to see mass onboarding to crypto and DeFi. There are so many opportunities within the DeFi space to implement privacy measures, especially in user-friendly ways.

- Ideas
    - **ZK UniSwap frontend -** develop a frontend for our uniswap smart contract found [here](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/noir-contracts/src/contracts/uniswap_contract)
    - **Shielding** - an app that allows users to convert public tokens into a private form, perform an action, and then unshield back into original token
    - **ZK stablecoin**
    - **Private lending**
    - **ZKollateral** - privately prove assets for collateral or creditworthiness for a loan
    - **Proof of Liquidity** - privately prove solvency and/or compliance without exposing the underlying assets or trades
    - **Private DEX** - allow users to trade assets without revealing the accounts that the assets originate from.

## Tooling 🔧

Aztec and Noir are new protocols, so we’re always updating the developer tooling. There is a lot we can do here so don’t let these ideas limit you!

- Ideas
    - **IDE language support** - we have some support with VSCode but would love to expand this through IDE features like auto-complete, hover for documentation, etc. You can find our Language Server protocol [here](https://noir-lang.org/getting_started/language_server)
    - **Ethereum History API** - trustlessly and optionally privately prove any piece of information that exists on Ethereum (e.g. token ownership, historical prices, protocol interactions, etc.) using Ethereum Storage Proofs in Noir - find example [here](https://github.com/Maddiaa0/noir-storage-proofs-demo)
    - **Regex support in Noir** - more info [here](https://speakerdeck.com/sorasuegami/ethcon-korea-2023-zk-email-on-chain-verification-of-emails-using-zkp)
    - **JSON parser in Noir**

### Proving backends

Noir does not compile to a specific proof system, so you can implement an entirely different proving system such as Halo2 or Marlin.

### Verifiers

The default UltraPlonk proving backend of Noir, [barretenberg](https://github.com/AztecProtocol/barretenberg), is currently capable of generating verifiers in [C++](https://github.com/noir-lang/aztec-connect/blob/kw/noir-dsl/barretenberg/src/aztec/plonk/proof_system/verifier/verifier.cpp) and [Solidity](https://github.com/noir-lang/aztec_backend/blob/master/common/src/contract/turbo_verifier.rs). You could extend barretenberg to generate verifiers implementable on other execution environments like Solana, Cosmos, Aptos, Sui, NEAR, Algorand, etc.

## DAOs 🤝

Imagine if DAOs could take privacy-preserving measures like anonymous voting and confidential proposal submission.

- Ideas
    - **zkVoting** - a protocol that anyone can easily implement into their DAO for privacy-preserving voting
    - **Private payments / payroll -** a system that allows DAOs to pay their contributors without revealing the amounts. This would greatly improve the UX and privacy of contributors.

## Data Protecting Proof of Concepts 🔓

We’re always looking to support applications that utilize privacy and ZK proofs in interesting and useful ways.

- Ideas
    - **zkPatreon** - privately unlock token-gated content by using Ethereum Storage Proofs in Noir
    - **zkEmail** - privately prove that some email was received, while hiding any private data in the e-mail, without trusting a centralized server to keep your privacy. Inspired by this [great blog post](https://blog.aayushg.com/posts/zkemail)
    - **Privacy Preserving Rewards Protocol** - an app or protocol that rewards participants for doing a specific on-chain action without revealing how much

## Gaming 👾

- Ideas
    - **ZK Poker**
    - **ZK Chess**
    - **ZK Scrabble**
    - **ZK Quests** - players can prove they have achieved a specific action or quest within a game without revealing the quest, preventing spoilers
    - **ZK Treasure Hunt** - irl experience that validates a user has found a clue/treasure without revealing their location to other players

## Identity 🕴️

Being able to have a private identity on the blockchain will become increasingly important as more & more use-cases come on chain. 

- Ideas
    - **Privacy-preserving KYC protocol**
    - **Private Account Abstraction Wallet using Touch or Face ID** - user logs in with TouchID/FaceID using AA, and zk proofs are generated to confirm that correct biometric data has been provided

---

# Hackathon success guide 💻

## Getting started on Aztec

### Sandbox

The Aztec Sandbox is an environment for local development on the Aztec Network. It's easy to get setup with just a single, simple command, and contains all the components needed to develop and test Aztec contracts and applications. 

Follow the quickstart [here](https://sandbox.aztec.network/).

### Deploying an example contract

Find more information about the sandbox and how to deploy a token contract to Aztec [here](https://aztec-docs-dev.netlify.app/dev_docs/getting_started/cli#i-have-the-sandbox-running-now-what).

### Writing private programs with aztec.nr

Noir is a ZKDSL for writing zk circuits and verifying them on-chain. [Aztec.nr](http://Aztec.nr) is a smart contract framework -- written in Noir -- that has types and methods for rich smart contract semantics.

## Submission tips

When you are ready to submit your project, please provide:

- Git repo
- A video or demo showcasing your project
- An explainer of how Aztec or Noir is utilized, and why it was chosen over another protocol

## Previous winners

| Name | Website | Description | Hackathon |
| --- | --- | --- | --- |
| Fruity Friends |  | Match two people who share common interests, such as fruits they like, without revealing any of them unless it matches the other person's interests | ZKHack |
| zk-zk-zkEVM |  | Implementation of Aztec Connect on Scroll | ZKHack |
| CryptoHub |  | Private NFT trading | ETHBerlin |
| ZK Microphone |  | Privately prove edited audio came from a real, physical microphone | ETHParis |

---

# Cool Noir projects

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