# @sparta/discord

Discord bot package for the Sparta project, providing Discord integration and command handling.

## Overview

This package provides the core Discord bot functionality for the Sparta project:

- Discord client setup and configuration
- Slash command registration and handling
- Role management and assignment
- User interaction through Discord channels
- Webhook message delivery

## Features

- Discord client setup and event handling
- API integration via OpenAPI-generated client
- Role management commands
- Human verification via Passport
- Chain information queries
- Node operator registration and monitoring

## Available Commands

The bot supports the following slash commands:

| Command     | Subcommand     | Description                                                                                      | Parameters                                                                                                                                      |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `/operator` | `chain-info`   | Get current chain information including pending/proven blocks, epoch, slot, and current proposer | None                                                                                                                                            |
| `/operator` | `my-stats`     | Check validator statistics                                                                       | `address` (required): The validator address to check                                                                                            |
| `/operator` | `register`     | Register as a validator and get the Apprentice role                                              | `address` (optional): Your validator address<br>`block-number` (optional): Block number for verification<br>`proof` (optional): Your sync proof |
| `/operator` | `help`         | Display operator commands and instructions                                                       | None                                                                                                                                            |
| `/mod`      | `info`         | Get comprehensive information about a node operator                                                | `username` (required): The Discord username of the operator                                                                                     |
| `/mod`      | `approve`      | Approve a user to join the validator set                                                         | `user` (required): The Discord username of the user to approve                                                                                  |
| `/mod`      | `help`         | Display all moderator commands and their descriptions in a table                                 | None                                                                                                                                            |

## Command Restrictions

### Moderator Commands

Moderator commands (`/mod`) have the following restrictions:

- **Role-based access**: Only users with one of these roles can use moderator commands:
  - Aztec Labs Team (ID: 1144693819015700620)
  - AzMod (ID: 1362901049803018513)
  - Admin (ID: 1146246812299165817)

- **Channel restrictions**:
  - In production: Commands can only be used in `#mod-bot` or `#bot-test` channels
  - In development: Commands can only be used in the `#bot-test` channel

### User Roles

- **Verified+**: Assigned to users who have successfully verified with Human Passport
- **Apprentice**: Assigned to users who successfully register as validators

## Usage

```typescript
import { getDiscordInstance, discordService } from '@sparta/discord';

// Get Discord instance
const discord = await getDiscordInstance();

// Send a message to a channel
await discordService.sendMessage('channel-id', 'Hello from Sparta bot!');

// Get Discord client for advanced usage
const client = discord.getClient();
```

## Components

### Discord Client

Main Discord client for interacting with the Discord API:

```typescript
import { getDiscordInstance } from '@sparta/discord';

// Initialize Discord client
const discord = await getDiscordInstance();

// Get the underlying Discord.js client
const client = discord.getClient();

// Check if the client is ready
if (client.isReady()) {
  console.log(`Logged in as ${client.user.tag}`);
}
```

### Discord Service

Service for common Discord operations:

```typescript
import { discordService } from '@sparta/discord';

// Send a message to a channel
await discordService.sendMessage('channel-id', 'Hello world!');

// Send an embed message
await discordService.sendEmbed('channel-id', {
  title: 'Validator Status',
  description: 'All validators are operational',
  color: 0x00ff00
});

// Assign a role to a user
await discordService.assignRole('guild-id', 'user-id', 'role-id');
```

### Discord Webhook Service

Service for sending messages via Discord webhooks:

```typescript
import { discordWebhookService } from '@sparta/discord';

// Send a webhook message
await discordWebhookService.sendMessage({
  webhookUrl: 'https://discord.com/api/webhooks/...',
  content: 'Alert: Validator offline!',
  username: 'Sparta Monitoring'
});
```

## Configuration

The Discord client is configured through environment variables:

- `BOT_TOKEN`: Discord bot token
- `BOT_CLIENT_ID`: Discord application client ID
- `GUILD_ID`: Discord server (guild) ID
- `PEER_CRAWLER_AUTH_TOKEN`: Authentication token for the Nethermind peer crawler API (required for validator peer network data)

## Development

```bash
# Build types
bun run types

# Run in development mode with hot reloading
bun run dev

# Run in production mode
bun run start
``` 
