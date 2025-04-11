# Node Operator Role Commands

The Node Operator role is the base role for users in the Sparta Discord bot system. Users who have successfully verified in Discord receive this role and can access the following commands.

## Available Commands

| Command      | Subcommand | Arguments                                 | Description                                                                                            |
| ------------ | ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/get-info`  |            |                                           | Get chain information including pending block, proven block, current epoch, current slot, and proposer |
| `/validator` | `check`    | `address`                                 | Check if an address is a validator                                                                     |
|              | `register` | `address`, `block-number`, `merkle-proof` | Register a validator address                                                                           |
|              | `help`     | `subcommand`                              | Get help for a specific validator subcommand                                                           |

## Command Details

### `/get-info`

Retrieves current blockchain state information.

**Usage**: `/get-info`

**Returns**:
- Pending block number: The latest block being processed
- Proven block number: The latest block that has been cryptographically proven
- Current epoch: The current epoch number
- Current slot: The current slot number
- Current proposer: The address of the current block proposer
- Validators: List of current validators
- Committee members: Current committee members for the epoch

**Example Response**:
```
Chain Information:
Pending Block: 1234
Proven Block: 1230
Current Epoch: 45
Current Slot: 3
Current Proposer: 0x1234...5678
```

### `/validator check`

Checks if a given Ethereum address is a registered validator.

**Usage**: `/validator check address:0x1234...5678`

**Arguments**:
- `address`: The Ethereum address to check

**Returns**:
- Validation status (is/is not a validator)
- If a validator, additional information such as:
  - Date registered
  - Stake amount
  - Current status

**Example Response**:
```
Address 0x1234...5678 is a registered validator.
Registered since: Jan 15, 2023
Stake: 100 ETH
Status: Active
```

### `/validator register`

Registers a new validator address on the blockchain.

**Usage**: `/validator register address:0x1234...5678 block-number:123456 merkle-proof:0xabcd...1234`

**Arguments**:
- `address`: The Ethereum address to register as a validator
- `block-number`: The block number for the merkle proof
- `merkle-proof`: Cryptographic proof of eligibility

**Returns**:
- Registration status (success/failure)
- Transaction hash if successful
- Error message if failed

**Example Response**:
```
Successfully registered validator 0x1234...5678.
Transaction: 0xabcd...1234
Block: 7654321
```

### `/validator help`

Provides help information for validator commands.

**Usage**: `/validator help subcommand:check`

**Arguments**:
- `subcommand`: The validator subcommand to get help for (`check`, `register`)

**Returns**:
- Detailed help information for the specified subcommand

**Example Response**:
```
Validator Check Command Help:
The check command verifies if an address is a registered validator.
Usage: /validator check address:0x1234...5678
The address should be a valid Ethereum address.
```

## Permission Requirements

- All users with the Node Operator role can access these commands
- The `/validator register` command requires additional verification that the user controls the address being registered

## Technical Implementation

These commands are implemented in:
- `getChainInfo.ts`: Handles the `/get-info` command
- `validator.ts`: Handles all validator-related commands

The commands interact with the Ethereum blockchain using the ChainInfoService and ValidatorService.

