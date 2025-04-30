# @sparta/discord

This package provides Discord bot functionality for the Sparta project. It communicates with the backend API server using OpenAPI-generated clients instead of directly calling the database.

## Features

- Discord client setup and event handling
- API integration via OpenAPI-generated client
- Role management commands
- Human verification via Passport
- Chain information queries

## Available Commands

The bot supports the following slash commands:

| Command     | Subcommand     | Description                                                                                      | Parameters                                           |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `/human`    | `verify`       | Verify your identity with Human Passport                                                         | None                                                 |
| `/human`    | `status`       | Check your Human Passport verification status                                                    | None                                                 |
| `/operator` | `chain-info`   | Get current chain information including pending/proven blocks, epoch, slot, and current proposer | None                                                 |
| `/operator` | `my-stats`     | Check validator statistics                                                                       | `address` (required): The validator address to check |
| `/admin`    | `help`         | Display all admin commands and their descriptions in a table                                     | None                                                 |
| `/admin`    | `is-in-set`    | Check if an address is in the validator set                                                      | `address` (required): The validator address to check |
| `/admin`    | `is-attesting` | Check if an address is actively attesting                                                        | `address` (required): The validator address to check |

## Command Restrictions

### Admin Commands

Admin commands (`/admin`) have the following restrictions:

- **Role-based access**: Only users with one of these roles can use admin commands:
  - Aztec Labs Team
  - AzMod
  - Admin

- **Channel restrictions**:
  - In production: Commands can only be used in `#mod-bot` or `#bot-test` channels
  - In development: Commands can only be used in the `#bot-test` channel

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
- `API_URL`: Backend API server URL
- `MINIMUM_SCORE`: Minimum score required for verification
- `VITE_APP_API_URL`: Frontend URL for verification links
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
