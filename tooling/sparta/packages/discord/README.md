# @sparta/discord

This package provides Discord bot functionality for the Sparta project. It communicates with the backend API server using OpenAPI-generated clients instead of directly calling the database.

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
| `/mod`      | `help`         | Display all moderator commands and their descriptions in a table                                 | None                                                                                                                                            |
| `/mod`      | `is-in-set`    | Check if an address is in the validator set                                                      | `address` (required): The validator address to check                                                                                            |
| `/mod`      | `is-attesting` | Check if an address is actively attesting                                                        | `address` (required): The validator address to check                                                                                            |

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

// Get a Discord instance
const discord = await getDiscordInstance();

// Use the Discord service to manage roles
await discordService.assignRole(userId, roleName);
```

## Environment Variables

The following environment variables are required:

- `BOT_TOKEN`: Discord bot token
- `BOT_CLIENT_ID`: Discord client ID
- `GUILD_ID`: Discord guild (server) ID
- `API_URL`: API URL for verification links and API
- `NODE_ENV`: Environment setting, affects command restrictions and behavior

## Development

To build the package:

```bash
pnpm build
```

To clean the build:

```bash
pnpm clean
``` 
