# Hacker Handbook

Aztec is an L2 that brings programmable privacy to Ethereum.

Aztec allows developers to access both public and private state machines for flexible and confidential transactions.

A key part of the Aztec ecosystem is [Noir](https://noir-lang.org/), an open-source zk circuit writing language that simplifies the creation of private smart contracts. This language is developed by the Aztec team, and forms the basis of the [Aztec.nr](https://docs.aztec.network/dev_docs/contracts/main) framework for writing smart contracts.

Learn more about our mission in our blog post [here](https://medium.com/aztec-protocol/aztec-the-hybrid-zkrollup-a90a197bf22e).
And more about what we're currently working on in this blog post about the [Aztec Sandbox](https://aztec.network/blog/announcing-aztec-sandbox-the-endgame-for-smart-contract-privacy/)

In this hacker handbook, you’ll find

- [Inspiration](INSPIRATION.md) of ZK project ideas for playing around with Aztec & Noir or entering hackathons
- How to [better your chances of winning](#hackathon-success-guide-) an Aztec prize at a hackathon. You can see more cool Noir projects in the [Inspiration page](./INSPIRATION.md#cool-noir-projects)
- A [list of projects and tooling](TOOLS.md) that you can utilize or build on top of

Also be sure to check out [this list of resources](../README.md)

## Hackathon success guide 💻

### Getting started on Noir

See the [Getting Started](https://noir-lang.org/getting_started/nargo_installation/) section of the Noir docs to get set up with Noir.

### Getting started on Aztec

#### Sandbox

The Aztec Sandbox is an environment for local development on the Aztec Network. It's easy to get setup with just a single, simple command, and contains all the components needed to develop and test Aztec contracts and applications.

Follow the quickstart [here](https://sandbox.aztec.network/).

#### Deploying an example contract

Find more information about the sandbox and how to deploy a token contract to Aztec [here](https://aztec-docs-dev.netlify.app/dev_docs/getting_started/cli#i-have-the-sandbox-running-now-what).

#### Writing private programs with aztec.nr

Noir is a ZKDSL for writing zk circuits and verifying them on-chain. [Aztec.nr](http://Aztec.nr) is a smart contract framework -- written in Noir -- that has types and methods for rich smart contract semantics.

## Submission tips

When you are ready to submit your project, please provide:

- Git repo
- A video or demo showcasing your project
- An explainer of how Aztec or Noir is utilized, and why it was chosen over another protocol

## Previous winners

| Name                 | Website                                                              | Description                                                                                                                                                                                                                                                            | Hackathon   |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Fruity Friends       |                                                                      | Match two people who share common interests, such as fruits they like, without revealing any of them unless it matches the other person's interests                                                                                                                    | ZKHack      |
| zk-zk-zkEVM          |                                                                      | Implementation of Aztec Connect on Scroll                                                                                                                                                                                                                              | ZKHack      |
| CryptoHub            |                                                                      | Private NFT trading                                                                                                                                                                                                                                                    | ETHBerlin   |
| ZK Microphone        |                                                                      | Privately prove edited audio came from a real, physical microphone                                                                                                                                                                                                     | ETHParis    |
| BillionZKVoters      | [project](https://ethglobal.com/showcase/billionzkvoters-hw1br)      | Massive scale secret voting with on-chain results using Zero Knowledge technology                                                                                                                                                                                      | ETHOnline   |
| AztecGravix          | [project](https://ethglobal.com/showcase/aztecgravix-fag8m)          | Decentralized perpetual exchange built on ZK-contracts empowering full user privacy                                                                                                                                                                                    | ETHOnline   |
| Noir LSP Doc Symbols | [project](https://ethglobal.com/showcase/noir-lsp-doc-symbols-mvkyo) | Implemented textDocument/documentSymbol for nargo/noir LSP in the main noir repo's LSP crate                                                                                                                                                                           | ETHOnline   |
| ProgWallet           | [project](https://ethglobal.com/showcase/progwallet-4jgsr)           | Program the validity of your transaction without (too much) worry about the fee and privacy                                                                                                                                                                            | ETHIstanbul |
| Green Zkrciticty     | [project](https://ethglobal.com/showcase/green-zkrciticty-xfyd9)     | Embracing Zero-Knowledge to Combat Climate Change through Green Electricity                                                                                                                                                                                            | ETHIstanbul |
| AztecSnap            | [project](https://ethglobal.com/showcase/aztecsnap-prn4s)            | Aztec Snap is the first MetaMask Snap for Aztec. Private transfer to any Aztec account while utilizing the existing MetaMask credential. Privately interact with confidential Aztec smart contract                                                                     | ETHIsanbul  |
| ZKvote.cc            | [project](https://ethglobal.com/showcase/zkvote-cc-rsvkt)            | To address the challenges of cross-chain voting, our protocol integrates Voting tokens with standard ERC-20 via bridge, processes voting off-chain, and employs ZK proofs for secure L2 State transfer. This ensures compatibility with existing bridge architectures. | ETHIstanbul |
| Pepe's Computation   | [project](https://ethglobal.com/showcase/pepes-computation-q2v90)    | Moving from a centralized gaming industry to a decentralized future in which individuals can shape the roadmap games are taking. "Pepe's Party Computation" uses zk-SNARKS and two-party computation to solve trustless self-policing and decentralized fog-of-war     | ETHIstanbul |
| Sarma+EVM=ZKEVM,PEXC | [project](https://ethglobal.com/showcase/sarma-evm-zkevm-pexc-9wp7o) | Sarma: simple primitive to achieve private execution on EVM, even cross-chain.                                                                                                                                                                                         | ETHIstabul  |
| Vitalik's Secret     | [project](https://ethglobal.com/showcase/vitaliks-secret-ajwsw)      | A world scale puzzle that challenge anyone to find the best solution. It is a NP-hard problem so rife for exploration                                                                                                                                                  | ETHIstanbul |
