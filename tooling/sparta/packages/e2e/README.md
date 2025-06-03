# E2E Tests

This package contains end-to-end tests for the Sparta API, organized into logical test suites.

## Structure

- **`index.test.ts`** - Main entry point that runs all test suites
- **`operator/`** - Node operator related tests
  - `operator.test.ts` - Tests for creating, updating, approving, and deleting operators
- **`validator/`** - Validator related tests  
  - `validator.test.ts` - Tests for adding, retrieving, and managing validators
- **`shared/`** - Common utilities and test data
  - `utils.ts` - Shared helper functions, API client, and test data

## Running Tests

Run all e2e tests:
```bash
npm run test:e2e
```

Run only operator tests:
```bash
npm run test:operator
```

Run only validator tests:
```bash
npm run test:validator
```

## Test Features

### Operator Tests
- Create and retrieve node operators
- Update operator wallet addresses
- Approve/unapprove operators
- Delete operators

### Validator Tests
- Get all validators from blockchain and database
- Add validators to approved operators
- **Get validator by address** - Tests the new address parameter functionality
- Handle invalid address formats (400 errors)
- Handle non-existent addresses (404 errors)
- Add validators on-chain
- Reject validator addition for unapproved operators
- Remove validators from operators
- Handle validator lookup by Discord username

## Requirements

These tests require:
- A running Sparta API server
- DynamoDB (local or AWS)
- Anvil blockchain network (for on-chain tests)
- Environment variables configured (.env file)

The tests include automatic setup and cleanup for test isolation.
