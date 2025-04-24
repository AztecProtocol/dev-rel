# Admin Role Commands

The Admin role provides advanced management capabilities for users with administrator permissions in the Sparta Discord bot system. This role is designed for system administrators who need to manage validators and view detailed system information.

## Available Commands

| Command  | Subcommand       | Arguments | Description                                                |
| -------- | ---------------- | --------- | ---------------------------------------------------------- |
| `/admin` | `get validators` |           | Get a list of all validators and their forwarder addresses |
|          | `get committee`  |           | Get the current committee members and their forwarders     |
|          | `remove`         | `address` | Remove a validator from the system                         |
|          | `fund`           | `address` | Fund a validator with Sepolia ETH                          |

## Command Details

### `/admin get validators`

Retrieves a list of all validators in the system and their corresponding forwarder addresses.

**Usage**: `/admin get validators`

**Returns**:
- Paginated list of validator addresses and their associated forwarder addresses

**Example Response**:
```
Validators (Forwarders):
0x1234...5678 -> 0xabcd...efgh
0x5678...1234 -> 0xefgh...abcd
...
```

### `/admin get committee`

Retrieves the current committee members and their forwarder addresses.

**Usage**: `/admin get committee`

**Returns**:
- Paginated list of committee member addresses and their associated forwarder addresses

**Example Response**:
```
Committee (Forwarders):
0x1234...5678 -> 0xabcd...efgh
0x5678...1234 -> 0xefgh...abcd
...
```

### `/admin remove`

Removes a validator from the system.

**Usage**: `/admin remove address:0x1234...5678`

**Arguments**:
- `address`: The Ethereum address of the validator to remove

**Returns**:
- Confirmation message indicating successful removal or error message

**Example Response**:
```
Removed validator 0x1234...5678
```

### `/admin fund`

Funds a validator with Sepolia ETH.

**Usage**: `/admin fund address:0x1234...5678`

**Arguments**:
- `address`: The Ethereum address of the validator to fund

**Returns**:
- Confirmation message indicating successful funding or error message

**Example Response**:
```
Successfully funded validator 0x1234...5678
```

## Permission Requirements

- Only users with Discord Administrator permissions can access these commands
- These commands are intended for system administrators responsible for maintaining the validator network

## Technical Implementation

These commands are implemented in:
- `getValidators.ts`: Handles retrieving the list of validators
- `getCommittee.ts`: Handles retrieving the committee members
- `remove.ts`: Handles removing validators
- `fund.ts`: Handles funding validators

The commands interact with the Ethereum blockchain using the ChainInfoService and ValidatorService. 
