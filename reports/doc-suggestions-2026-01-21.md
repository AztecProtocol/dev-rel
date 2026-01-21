# Documentation Update Suggestions

Generated: 2026-01-21T14:22:56.566Z
Scan period: Last 7 days

## Summary

| Metric | Value |
|--------|-------|
| Docs with references analyzed | 67 |
| Total references checked | 105 |
| Stale references found | 16 |
| Suggestions generated | 1 |

### By Priority

- **High priority**: 0
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

### Medium Priority

These documentation files may need updates for new features or changed defaults.

#### `docs/developer_versioned_docs/version-v4.0.0-nightly.20260121/docs/aztec-nr/framework-description/advanced/how_to_retrieve_filter_notes.md`

**Source file**: `noir-projects/noir-contracts/contracts/test/pending_note_hashes_contract/src/filter.nr`
**Related PR**: [#19768](https://github.com/AztecProtocol/aztec-packages/pull/19768)
**Confidence**: 90%

**What changed**: The note retrieval API has changed from using RetrievedNote to HintedNote types in the custom filter examples.

**Suggested updates**:
- Update the custom filter code example to use HintedNote<FieldNote> instead of RetrievedNote<FieldNote> in function signatures and variable declarations
- Update the variable name from 'retrieved_note' to 'hinted_note' in the custom filter example to match the actual source code
- Verify and update the return type documentation for get_notes() method to reflect it returns BoundedVec<HintedNote<MyNote>, ...> instead of BoundedVec<RetrievedNote<MyNote>, ...>
- Update the imports section to include HintedNote if it's now the standard type used in note retrieval operations

<details>
<summary>Copy for Claude Code</summary>

```
Documentation file: docs/developer_versioned_docs/version-v4.0.0-nightly.20260121/docs/aztec-nr/framework-description/advanced/how_to_retrieve_filter_notes.md
Source file: noir-projects/noir-contracts/contracts/test/pending_note_hashes_contract/src/filter.nr
Related PR: https://github.com/AztecProtocol/aztec-packages/pull/19768

What changed: The note retrieval API has changed from using RetrievedNote to HintedNote types in the custom filter examples.

Please make these updates to the documentation:
- Update the custom filter code example to use HintedNote<FieldNote> instead of RetrievedNote<FieldNote> in function signatures and variable declarations
- Update the variable name from 'retrieved_note' to 'hinted_note' in the custom filter example to match the actual source code
- Verify and update the return type documentation for get_notes() method to reflect it returns BoundedVec<HintedNote<MyNote>, ...> instead of BoundedVec<RetrievedNote<MyNote>, ...>
- Update the imports section to include HintedNote if it's now the standard type used in note retrieval operations
```

</details>

---

