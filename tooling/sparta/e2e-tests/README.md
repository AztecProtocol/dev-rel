# Sparta E2E Tests

This directory contains end-to-end tests for the Sparta services using Bun's testing capabilities.

## Available Tests

- **API Service**: Tests for the Express API service
- **Discord Bot**: Tests for the Discord bot functionality
- **Scheduler**: Tests for the scheduler service
- **Ethereum**: Tests for Ethereum-related functionality

## Running Tests

To run all tests:

```bash
bun test
```

To run a specific test file:

```bash
bun test src/api.test.ts
```

To run tests with coverage:

```bash
bun test --coverage
```

## Test Structure

Each test file follows a similar pattern:

1. Mock the necessary dependencies
2. Set up test data
3. Define tests for key functionality
4. Use Bun's built-in assertions to verify behavior

## Adding New Tests

1. Create a new test file in the `src` directory
2. Import the necessary testing utilities from `bun:test`
3. Mock any external dependencies
4. Write your tests using the `test()` and `describe()` functions
5. Run the tests to verify they pass

## Notes

- These tests use mocks to simulate services rather than connecting to real infrastructure
- For more complex scenarios, consider adding integration tests that connect to local test instances
- Refer to the [Bun documentation](https://bun.sh/docs/test/writing) for more details on writing tests 