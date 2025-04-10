# Sparta Discord Bot - Source Code

This directory contains the source code for the Sparta Discord bot, which manages Aztec validators and Discord roles.

## Project Structure

The project is organized into several directories:

- **clients/**: API client interfaces for external services (Discord, Ethereum, Google Sheets)
- **roles/**: Command implementations for different Discord roles
- **services/**: Core business logic services
- **utils/**: Utility functions and helpers

## Key Components

### Clients

The `clients/` directory contains interfaces to external services:

- **discord.ts**: Discord.js client setup and configuration
- **ethereum.ts**: Ethereum blockchain interaction via viem
- **google.ts**: Google Sheets API integration

### Services

The `services/` directory contains the core business logic:

- **chaininfo-service.ts**: Retrieves blockchain state information
- **discord-service.ts**: Manages Discord roles and user identification
- **googlesheet-service.ts**: Monitors Google Sheets for user scores and triggers role assignments
- **validator-service.ts**: Manages validator registration and funding

### Roles

The `roles/` directory contains command definitions for different user roles:

- **00_guardians/**: Commands available to users with the Guardian role
  - **validator.ts**: Commands for validator registration and checking
  - **getChainInfo.ts**: Commands for retrieving chain information
- **admins/**: Commands available only to administrators

## Key Functionality

### Role Management

The bot automatically assigns hierarchical Discord roles based on user scores from Google Sheets:

1. **Guardian**: Base role (default)
2. **Defender**: Middle role (score > 5)
3. **Sentinel**: Highest role (score > 10)

```typescript
// Example from googlesheet-service.ts
if (score > 10) {
  roleName = "Sentinel"; // Highest role
} else if (score > 5) {
  roleName = "Defender"; // Middle role
} else {
  roleName = "Guardian"; // Default/lowest role
}
```

### Validator Management

The bot provides commands to manage validators on the Ethereum network:

- Add validators
- Remove validators
- Check validator status
- Fund validators

```typescript
// Example validator registration
await ValidatorService.addValidator("0x123...");
```

### Chain Information

The bot provides commands to retrieve blockchain information:

- Current epoch and slot
- Pending and proven block numbers
- Committee members
- Current proposer

```typescript
// Example chain info retrieval
const chainInfo = await ChainInfoService.getInfo();
console.log(`Current epoch: ${chainInfo.currentEpoch}`);
```

## Environment Configuration

The application requires several environment variables to function correctly. Create a `.env` file based on the `.env.example` template with the following variables:

```
# Discord Bot Configuration
BOT_TOKEN=your_bot_token
BOT_CLIENT_ID=your_client_id
GUILD_ID=your_guild_id

# Ethereum Configuration
ETHEREUM_HOST=http://localhost:8545
MINTER_PRIVATE_KEY=your_private_key
ETHEREUM_REGISTRY_ADDRESS=your_registry_address
WITHDRAWER_ADDRESS=address_to_withdraw_funds_to
ETHEREUM_CHAIN_ID=1337
ETHEREUM_VALUE=20ether
MINIMUM_STAKE=100000000000000000000
APPROVAL_AMOUNT=10000000000000000000000

# Google Sheets Configuration
GOOGLE_API_KEY=your_api_key
SPREADSHEET_ID=your_spreadsheet_id
```

## Development

### Building and Running

The project uses Bun for package management and running:

```bash
# Install dependencies
bun install

# Run in development mode with hot reloading
bun run dev

# Build for production
bun run build

# Run in production mode
bun run start
```

### Adding New Commands

To add a new command:

1. Create a new command file in the appropriate role directory
2. Define the command using Discord.js slash command builders
3. Export the command and add it to the role's index.ts file

Example command structure:

```typescript
import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("command-name")
    .setDescription("Command description"),
  
  execute: async (interaction) => {
    // Command implementation
    await interaction.reply("Response message");
  }
};
```
