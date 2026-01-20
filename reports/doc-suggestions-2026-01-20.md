# Documentation Update Suggestions

Generated: 2026-01-20T03:44:56.129Z
Scan period: Last 7 days

## Summary

| Metric | Value |
|--------|-------|
| Docs with references analyzed | 14 |
| Total references checked | 25 |
| Stale references found | 4 |
| Suggestions generated | 3 |

### By Priority

- **High priority**: 2
- **Medium priority**: 1
- **Low priority**: 0

---

## How to Use This Report

1. Review the suggestions below, starting with high priority items
2. For items you want to address, copy the relevant section
3. Open Claude Code in the aztec-packages repo
4. Paste the suggestion and ask Claude to make the changes

### Example prompt for Claude Code:

```
The following documentation needs updating based on source code changes:

[paste suggestion section here]

Please update the documentation file to reflect these changes.
```

---

## Suggestions

### High Priority

These documentation files may be significantly out of date with breaking changes or new features.

#### `docs/network_versioned_docs/version-v2.1.4/reference/node_api_reference.md`

**Source file**: `yarn-project/stdlib/src/interfaces/aztec-node.ts`
**Related PR**: [#19672](https://github.com/AztecProtocol/aztec-packages/pull/19672)
**Confidence**: 95%

**What changed**: The block retrieval API has been refactored: getBlock() now only accepts block numbers (not hashes), a new getBlockByHash() method was added for hash-based lookups, and all block-related methods now return L2BlockNew instead of L2Block.

**Suggested updates**:
- Update the node_getBlock section to clarify it only accepts block numbers or 'latest', not block hashes
- Add a new node_getBlockByHash section documenting the new method for retrieving blocks by hash
- Update all block-related method documentation to specify they return L2BlockNew objects instead of L2Block
- Update the getBlocks method documentation to reflect it returns L2BlockNew[] instead of L2Block[]
- Review and update any code examples that might be using block hash parameters with the getBlock method

<details>
<summary>Copy for Claude Code</summary>

```
Documentation file: docs/network_versioned_docs/version-v2.1.4/reference/node_api_reference.md
Source file: yarn-project/stdlib/src/interfaces/aztec-node.ts
Related PR: https://github.com/AztecProtocol/aztec-packages/pull/19672

What changed: The block retrieval API has been refactored: getBlock() now only accepts block numbers (not hashes), a new getBlockByHash() method was added for hash-based lookups, and all block-related methods now return L2BlockNew instead of L2Block.

Please make these updates to the documentation:
- Update the node_getBlock section to clarify it only accepts block numbers or 'latest', not block hashes
- Add a new node_getBlockByHash section documenting the new method for retrieving blocks by hash
- Update all block-related method documentation to specify they return L2BlockNew objects instead of L2Block
- Update the getBlocks method documentation to reflect it returns L2BlockNew[] instead of L2Block[]
- Review and update any code examples that might be using block hash parameters with the getBlock method
```

</details>

---

#### `docs/network_versioned_docs/version-v2.1.9-ignition/reference/node_api_reference.md`

**Source file**: `yarn-project/stdlib/src/interfaces/aztec-node.ts`
**Related PR**: [#19672](https://github.com/AztecProtocol/aztec-packages/pull/19672)
**Confidence**: 95%

**What changed**: The getBlock method was split into getBlock (by number) and getBlockByHash (by hash), and all block-related methods now return L2BlockNew instead of L2Block.

**Suggested updates**:
- Add documentation for the new node_getBlockByHash method that takes a block hash parameter and returns L2BlockNew
- Update the node_getBlock method documentation to clarify it only accepts block numbers or 'latest', not block hashes
- Update all block-related method return types from L2Block to L2BlockNew in the documentation
- Add an example for node_getBlockByHash showing how to query blocks by hash

<details>
<summary>Copy for Claude Code</summary>

```
Documentation file: docs/network_versioned_docs/version-v2.1.9-ignition/reference/node_api_reference.md
Source file: yarn-project/stdlib/src/interfaces/aztec-node.ts
Related PR: https://github.com/AztecProtocol/aztec-packages/pull/19672

What changed: The getBlock method was split into getBlock (by number) and getBlockByHash (by hash), and all block-related methods now return L2BlockNew instead of L2Block.

Please make these updates to the documentation:
- Add documentation for the new node_getBlockByHash method that takes a block hash parameter and returns L2BlockNew
- Update the node_getBlock method documentation to clarify it only accepts block numbers or 'latest', not block hashes
- Update all block-related method return types from L2Block to L2BlockNew in the documentation
- Add an example for node_getBlockByHash showing how to query blocks by hash
```

</details>

---

### Medium Priority

These documentation files may need updates for new features or changed defaults.

#### `docs/docs-network/operators/reference/node-api-reference.md`

**Source file**: `yarn-project/stdlib/src/interfaces/aztec-node.ts`
**Related PR**: [#19672](https://github.com/AztecProtocol/aztec-packages/pull/19672)
**Confidence**: 90%

**What changed**: The getBlock method was split into two separate methods: getBlock (by number/latest) and getBlockByHash (by hash), and all block-related methods now return L2BlockNew instead of L2Block.

**Suggested updates**:
- Add documentation for the new node_getBlockByHash method with parameters (blockHash: string) and example usage
- Update the node_getBlock method documentation to clarify it only accepts block numbers or 'latest', not block hashes
- Update all references to L2Block return type to L2BlockNew in the getBlock, getBlocks, and getBlockByArchive method documentation
- Update the getPublishedBlocks method documentation to indicate it now returns CheckpointedL2Block instead of PublishedL2Block

<details>
<summary>Copy for Claude Code</summary>

```
Documentation file: docs/docs-network/operators/reference/node-api-reference.md
Source file: yarn-project/stdlib/src/interfaces/aztec-node.ts
Related PR: https://github.com/AztecProtocol/aztec-packages/pull/19672

What changed: The getBlock method was split into two separate methods: getBlock (by number/latest) and getBlockByHash (by hash), and all block-related methods now return L2BlockNew instead of L2Block.

Please make these updates to the documentation:
- Add documentation for the new node_getBlockByHash method with parameters (blockHash: string) and example usage
- Update the node_getBlock method documentation to clarify it only accepts block numbers or 'latest', not block hashes
- Update all references to L2Block return type to L2BlockNew in the getBlock, getBlocks, and getBlockByArchive method documentation
- Update the getPublishedBlocks method documentation to indicate it now returns CheckpointedL2Block instead of PublishedL2Block
```

</details>

---

