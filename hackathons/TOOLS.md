# Projects and tooling

## Dev Tools

### Noir

#### Syntax and plugins

💻 [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=noir-lang.vscode-noir) - Syntax highlight, error highlight, codelens, etc. ([Source Code](https://github.com/noir-lang/vscode-noir))

🖥️ [Vim Plugin](https://github.com/hhamud/tree-sitter-noir#neovim) - Syntax highlight

🖥️ [Emacs Plugin](https://melpa.org/#/noir-mode) - Syntax highlight ([Source Code](https://github.com/hhamud/noir-mode))

🖥️ [Tree-sitter-noir](https://github.com/hhamud/tree-sitter-noir) - Tree-sitter grammar for Noir language

🖥️ [Emacs Tree-sitter Plugin](https://melpa.org/#/noir-ts-mode) - Syntax highlight ([Source Code](https://github.com/hhamud/noir-ts-mode))

⛑️ [hardhat-noir](https://www.npmjs.com/package/hardhat-noir) - Hardhat plugin ([Source Code](https://github.com/spalladino/hardhat-noir))

🐍 [Python2Noir](https://github.com/storswiftlabs/python2noir) - From Python to Noir language transpiler

#### Noir Boilerplate

🍽️ [nplate](https://github.com/whitenois3/nplate) - Minimalist template

⛑️ [noir-hardhat-template](https://github.com/hooperben/noir-hardhat-template) - Hardhat template

🐈‍⬛ [noir-starter](https://github.com/noir-lang/noir-starter) - Template repository containing example projects using Noir (Next.js + Hardhat, Foundry, etc.)

🧑‍💻 [noir-starter-nuxt](https://github.com/iam-robi/noir-starter-nuxt) - Template repository containing example minimal project using Noir, Nuxt and Hardhat

#### Noir Libraries

- [Standard Library](https://github.com/noir-lang/noir/tree/master/noir_stdlib) - the Noir Standard Library

##### Types

- [BigInt](https://github.com/shuklaayush/noir-bigint) - a library that provides a custom BigUint56 data type, allowing for computations on large unsigned integers
- [Signed Int](https://github.com/resurgencelabs/signed_int) - a library for accessing a custom Signed Integer data type, allowing access to negative numbers on Noir
- [Fraction](https://github.com/resurgencelabs/fraction) - a library for accessing fractional number data type in Noir, allowing results that aren't whole numbers
- [U(int)2B(ytes)](https://github.com/colinnielsen/noir-u2b/tree/main) - a library for converting `u8`->`u120`s to `[u8]` array
- [ZKFloat](https://github.com/0x3327/ZKFloat) - a floating point library for Noir

##### Cryptography

- [Sparse Merkle Tree Verifier](https://github.com/vocdoni/smtverifier-noir/tree/main) - a library for verification of sparse Merkle trees
- [RSA](https://github.com/SetProtocol/noir-rsa) - this repository contains an implementation of a RSA signature verify for the Noir language
- [Merkle Root](https://github.com/tomoima525/noir-merkle-root) - a library for calculating Merkle root from given inputs. Using the Poseidon function for hashing
- [Quantized arithmetic](https://github.com/storswiftlabs/quantized_arithmetic) - a library for quantized value operations of zero-point quantization
- [SHA-1](https://github.com/michaelelliot/noir-sha1) - a library for generating hashes using SHA-1 hashing function
- [Hydra for BN254](https://github.com/TaceoLabs/noir-hydra) - symmetric encryption and decryption in Noir

##### Ethereum

- [Ethereum Storage Proof Verification](https://github.com/aragonzkresearch/noir-trie-proofs) - a library that contains the primitives necessary for RLP decoding (in the form of look-up table construction) and Ethereum state and storage proof verification (or verification of any trie proof involving 32-byte long keys)
- [ECrecover](https://github.com/colinnielsen/ecrecover-noir/tree/main) - a library to verify an ECDSA signature and return the source Ethereum address

##### Machine Learning

- [SKProof](https://github.com/0x3327/skproof) - a Scikit-learn compatible Python library for generating ZK proofs of execution
- [ML](https://github.com/metavind/noir-ml) - a library for implementing neural networks in Noir
- [zkML-Noir](https://github.com/storswiftlabs/zkml-noir) - a library for Python ML model transcoding Noir, including various algorithms such as Decision tree, K-Means, XGBoost, FNN, CNN
- [Matrix Operations](https://github.com/storswiftlabs/matrix_operations) - a library for matrix operations provides functionality for performing various matrix operations
- [Convolution](https://github.com/storswiftlabs/convolution) - a library for Convolutional Neural Network (CNN) library in Noir, including Convolutional layers, Pooling layers, and Linear (fully connected) layers.

##### Miscellaneous

- [Rate Limiting Nullifiers](https://github.com/Rate-Limiting-Nullifier/noir-rln) - a zero-knowledge gadget that enables spam prevention in anonymous environments

Find more in [🐈‍⬛ Awesome Noir](https://github.com/noir-lang/awesome-noir)

#### Support

Join the [Noir Discord](https://discord.gg/ycsCCdkPCe)

---

### Aztec Contracts

Many of the plugins and libraries listed above are also useful for writing Aztec contracts. In addition, the following resources are useful for Aztec contracts:

#### Resources

:book: [Aztec Docs](https://docs.aztec.network/)

#### Aztec Libraries

[Aztec.nr](https://aztec.nr) - a framework for writing Aztec smart contracts in Noir. You can review more detail about the structure and process around writing contracts in the [Aztec.nr docs pages](https://docs.aztec.network/dev_docs/contracts/main). The framework includes 4 libaries:

- `aztec` includes core functionality
- `easy-private-state` for creating and managing private state
- `safe-math` for safe math operations
- `value-note` for storing arbitrary values in notes

#### Aztec Boilerplate

🧰 Aztec boxes - Example full stack Aztec dapps out of the box. See the [private token example](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/boxes/private-token) for a functioning reference and the full list [here](https://github.com/AztecProtocol/aztec-packages/tree/master/yarn-project/boxes).

#### Support

Join the [Aztec Discord](https://discord.aztec.network).
