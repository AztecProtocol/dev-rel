# Documentation Update Suggestions

Generated: 2026-01-22T03:50:05.414Z
Lookback: 7 days | Docs analyzed: 67 | References: 105 | Stale: 15

**Suggestions**: 0 high, 1 medium, 1 low

---

## Suggestions

### Medium Priority

These documentation files may need updates for new features or changed defaults.

#### `docs/developer_versioned_docs/version-v4.0.0-nightly.20260121/docs/aztec-nr/framework-description/advanced/how_to_retrieve_filter_notes.md`

**Source**: `noir-projects/noir-contracts/contracts/test/pending_note_hashes_contract/src/filter.nr` | **PR**: [#19768](https://github.com/AztecProtocol/aztec-packages/pull/19768) | **Confidence**: 90%

The source code uses `HintedNote<FieldNote>` type instead of `RetrievedNote<FieldNote>` as shown in the documentation examples.

**Updates needed**:
- Update the custom filter code example to use `HintedNote<FieldNote>` instead of `RetrievedNote<FieldNote>` in the function signature and variable declarations
- Update the variable name from `retrieved_note` to `hinted_note` in the custom filter example to match the actual source code
- Verify and update other code examples in the documentation to ensure they use the correct note type (`HintedNote` vs `RetrievedNote`) consistently

---

### Low Priority

These documentation files may have minor updates needed.

#### `docs/developer_versioned_docs/version-v4.0.0-nightly.20260121/docs/aztec-nr/framework-description/advanced/how_to_prove_history.md`

**Source**: `noir-projects/noir-contracts/contracts/app/claim_contract/src/main.nr` | **PR**: [#19803](https://github.com/AztecProtocol/aztec-packages/pull/19803) | **Confidence**: 95%

The code example in the documentation now assigns the return value of `prove_note_inclusion` to an unused variable using `let _ =` instead of calling it without assignment.

**Updates needed**:
- Update the code example in the 'Prove note inclusion' section to change 'header.prove_note_inclusion(proof_retrieved_note);' to 'let _ = header.prove_note_inclusion(proof_retrieved_note);'
- Update the variable name in the code example from 'proof_retrieved_note' to 'hinted_note' to match the actual source code parameter name

---

