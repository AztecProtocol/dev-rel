# @sparta/ethereum

Ethereum blockchain interaction library for the Sparta project.

## Overview

This package provides blockchain connectivity and utilities for interacting with Ethereum networks, specifically for Aztec validators management. It handles:

- Connection to Ethereum nodes
- Transaction creation and sending
- Contract interactions
- Chain information retrieval

## Usage

```typescript
import { getEthereumInstance, l2InfoService } from '@sparta/ethereum';

// Get an ethereum instance
const ethereum = await getEthereumInstance();

// Get chain info
const chainInfo = await ethereum.getChainInfo();
console.log(chainInfo);

// Get L2 info
const blockInfo = await l2InfoService.getLatestL2Block();
console.log(blockInfo);
```

## Components

### Ethereum Client

The main client for interacting with the Ethereum blockchain:

```typescript
import { getEthereumInstance } from '@sparta/ethereum';

const ethereum = await getEthereumInstance();

// Check if an address is a validator
const isValidator = await ethereum.isValidator('0x1234...');

// Get chain information
const chainInfo = await ethereum.getChainInfo();
```

### L2 Info Service

Service for retrieving Layer 2 information, primarily validator statistics.

```typescript
import { l2InfoService } from '@sparta/ethereum';

// Example: Fetching validator statistics
async function getValidatorStats(validatorAddress: string) {
  try {
    // Initialize the service (if not done globally)
    // await l2InfoService.init(); // Or ensure it's called once at startup

    const stats = await l2InfoService.fetchValidatorStats(validatorAddress);
    if (stats.error) {
      console.error(`Error fetching stats for ${validatorAddress}: ${stats.error}`);
    } else {
      console.log(`Stats for ${validatorAddress}:`, stats);
      // stats.hasAttested24h, stats.missedAttestationsCount, etc.
    }
  } catch (err) {
    console.error('Failed to get validator stats:', err);
  }
}

// Make sure to initialize l2InfoService once, e.g., at application startup
// await l2InfoService.init();
```

## Configuration

The Ethereum client is configured through environment variables:

- `ETHEREUM_HOST`: RPC endpoint URL
- `L1_CHAIN_ID`: Chain ID for the Ethereum network
- `STAKING_ASSET_HANDLER_ADDRESS`: Contract address for validator staking

## Development

Build the package:

```bash
bun run build
``` 