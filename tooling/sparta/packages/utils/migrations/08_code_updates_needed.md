# Code Updates Required After Migration 08

After running migration `08_simplify_validators_field`, the following code changes are needed:

## Summary of Changes
1. **Operators table**: `validators` field changed from array of objects to array of strings
2. **Validators table**: `nodeOperatorId` field changed from Discord ID to operator address
3. **Operators table**: Removed `isApproved` and `wasSlashed` fields

## Files That Need Updates

### 1. `/packages/express/src/routes/validators.ts`

**Line ~260**: Change from getting operator by Discord ID to getting by address
```typescript
// OLD:
operator = await nodeOperatorService.getOperatorByDiscordId(validator.nodeOperatorId);

// NEW:
operator = await nodeOperatorService.getOperatorByAddress(validator.nodeOperatorId);
```

**Line ~314**: Pass operator address instead of Discord ID
```typescript
// OLD:
const validators = await validatorService.getValidatorsByNodeOperator(operator.discordId!, historyLimit);

// NEW:
const validators = await validatorService.getValidatorsByNodeOperator(operator.address, historyLimit);
```

**Lines ~468, ~472, ~688, ~814**: Compare with operator address instead of Discord ID
```typescript
// OLD:
if (existingValidator.nodeOperatorId === discordId) {

// NEW:
if (existingValidator.nodeOperatorId === operator.address) {
```

### 2. `/packages/express/src/domain/validators/service.ts`

Update comments and parameter descriptions:
```typescript
// Line ~6: Update comment
nodeOperatorId?: string; // GSI Partition Key: NodeOperatorIndex - contains operator address

// Line ~100: Update parameter description
* @param nodeOperatorId The operator address (not Discord ID).

// Line ~120: Update parameter description
* @param nodeOperatorId The operator address (not Discord ID).

// Line ~165: Update parameter description
* @param nodeOperatorId Optional operator address.
```

### 3. `/packages/express/src/db/validatorRepository.ts`

Update parameter names and comments to reflect that nodeOperatorId contains addresses:
```typescript
// Consider renaming parameter for clarity
async findByNodeOperator(
    operatorAddress: string,  // renamed from nodeOperatorId
    includeHistory: boolean = true,
    historyLimit: number = 100
): Promise<Validator[]>
```

### 4. `/packages/e2e/validator/validator.test.ts`

Update tests to expect operator addresses instead of Discord IDs:
```typescript
// Line ~180:
expect(validatorFound.nodeOperatorId).toBe(validatorTestOperator.address);

// Line ~316:
expect(val).toHaveProperty("nodeOperatorId", validatorTestOperator2.address);
```

### 5. `/packages/express/src/db/nodeOperatorRepository.ts`

Update methods that count validators to use operator addresses instead of Discord IDs when querying the validators table.

### 6. Code that creates validators

When creating new validators, ensure `nodeOperatorId` is set to the operator's address, not Discord ID:
```typescript
// When creating a validator
await validatorService.ensureValidatorExists(validatorAddress, operator.address);
```

## Migration Rollback Considerations

If you need to rollback:
1. The `validators` field would need to be converted back to array of objects
2. The `nodeOperatorId` field would need to be converted back to Discord IDs
3. The `isApproved` and `wasSlashed` fields cannot be restored without backup

## Testing After Migration

1. Test validator creation with operator address in nodeOperatorId
2. Test querying validators by operator
3. Test operator-validator associations
4. Update integration tests to expect new data structure 