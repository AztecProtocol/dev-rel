# Documentation Update Suggestions

Generated: 2026-01-27T03:51:50.309Z
Lookback: 7 days | Docs analyzed: 67 | References: 105 | Stale: 17

**Suggestions**: 1 high, 1 medium, 0 low

---

## Suggestions

### High Priority

These documentation files may be significantly out of date with breaking changes or new features.

#### `docs/developer_versioned_docs/version-v4.0.0-nightly.20260126/docs/tutorials/contract_tutorials/token_contract.md`

**Source**: `docs/examples/ts/bob_token_contract/index.ts` | **PR**: [#19901](https://github.com/AztecProtocol/aztec-packages/pull/19901) | **Confidence**: 95%

The TypeScript example code has been reformatted with different code style and significant API changes including account manager pattern and removal of explicit .wait() calls.

**Updates needed**:
- Update all code examples in the documentation to use the new account manager pattern (giggleAccountManager.address instead of (await giggleAccount.getAccount()).getAddress())
- Remove all .wait() calls from transaction examples as they are no longer needed in the API
- Update the contract deployment pattern to use the new simplified syntax: BobTokenContract.deploy(wallet).send() instead of .deployed()
- Remove the openTmpStore import from the imports section as it's no longer used
- Update code formatting in examples to match the new style (double quotes, consistent indentation)

---

### Medium Priority

These documentation files may need updates for new features or changed defaults.

#### `docs/developer_versioned_docs/version-v4.0.0-nightly.20260126/docs/tutorials/js_tutorials/aztecjs-getting-started.md`

**Source**: `docs/examples/ts/aztecjs_getting_started/index.ts` | **PR**: [#19901](https://github.com/AztecProtocol/aztec-packages/pull/19901) | **Confidence**: 90%

The source code removed `.wait()` calls from transaction methods and simplified the deployment pattern by removing the intermediate `.deployed()` call.

**Updates needed**:
- Update the deploy section to show the simplified deployment pattern: `TokenContract.deploy(...).send({ from: alice.address })` instead of the current pattern with `.deployed()`
- Remove `.wait()` calls from all transaction examples in the mint, transfer, and set_minter sections to match the updated async pattern
- Update any explanatory text that references waiting for transactions to complete, as the new pattern appears to handle this automatically

---

