#!/usr/bin/env bun

import { Command } from 'commander';
import { createWalletClient, http, parseEther, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';
import { randomUUID } from 'crypto';
import chalk from 'chalk';

interface MessageComponents {
  discord_id: string;
  x_id?: string;
  nonce: string;
  domain: string;
  timestamp: number;
}

interface GeneratedMessage {
  canonical_message: string;
  components: MessageComponents & {
    timestamp_iso: string;
  };
  expiry: {
    timestamp: number;
    timestamp_iso: string;
    expires_in_seconds: number;
  };
  signature?: {
    signature: string;
    wallet_address: string;
    message_hash: string;
  };
}

function generateCanonicalMessage(components: MessageComponents): string {
  const parts: string[] = [];
  
  parts.push(`discord=${components.discord_id}`);
  
  if (components.x_id) {
    parts.push(`x=${components.x_id}`);
  }
  
  parts.push(`nonce=${components.nonce}`);
  parts.push(`domain=${components.domain}`);
  parts.push(`timestamp=${components.timestamp}`);
  
  return `link-socials::${parts.join(';')}`;
}

function validateDiscordId(discordId: string): boolean {
  return /^[0-9]{17,19}$/.test(discordId);
}

function validateXId(xId: string): boolean {
  return /^[0-9]+$/.test(xId);
}

function validatePrivateKey(privateKey: string): boolean {
  // Basic validation - should be 64 hex characters (32 bytes) with optional 0x prefix
  const cleanKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  return /^[a-fA-F0-9]{64}$/.test(cleanKey);
}

async function signMessage(message: string, privateKey: string): Promise<{
  signature: string;
  wallet_address: string;
  message_hash: string;
}> {
  // Ensure private key has 0x prefix
  const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  const account = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http()
  });

  const signature = await walletClient.signMessage({
    message
  });

  // Generate message hash using keccak256 of the prefixed message
  const { keccak256, toBytes } = await import('viem');
  const messageBytes = toBytes(message);
  const prefixedMessage = `\x19Ethereum Signed Message:\n${messageBytes.length}${message}`;
  const messageHash = keccak256(toBytes(prefixedMessage));

  return {
    signature,
    wallet_address: account.address,
    message_hash: messageHash
  };
}

function formatOutput(result: GeneratedMessage, verbose: boolean, jsonOutput: boolean): void {
  if (jsonOutput) {
    // Simple JSON format as requested
    const output: any = {
      message: result.canonical_message
    };
    
    if (result.signature) {
      output.signature = result.signature.signature;
      output.address = result.signature.wallet_address;
    }
    
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (verbose) {
    console.log(chalk.blue('=== Sparta Social Verification Message ==='));
    console.log(chalk.green('Discord ID:'), result.components.discord_id);
    
    if (result.components.x_id) {
      console.log(chalk.green('X ID:'), result.components.x_id);
    }
    
    console.log(chalk.green('Domain:'), result.components.domain);
    console.log(chalk.green('Nonce:'), result.components.nonce);
    console.log(chalk.green('Timestamp:'), `${result.components.timestamp} (${result.components.timestamp_iso})`);
    console.log(chalk.green('Expires:'), `${result.expiry.timestamp_iso} (5 minutes)`);
    
    if (result.signature) {
      console.log(chalk.green('Wallet Address:'), result.signature.wallet_address);
      console.log(chalk.green('Signature:'), result.signature.signature);
      console.log(chalk.green('Message Hash:'), result.signature.message_hash);
    }
    
    console.log('');
    console.log(chalk.blue('Canonical Message:'));
    console.log(result.canonical_message);
    
    console.log('');
    console.log(chalk.yellow('Note: This message expires in 5 minutes (300 seconds)'));
    
    if (result.signature) {
      console.log(chalk.yellow('Message has been signed with the provided wallet'));
    } else {
      console.log(chalk.yellow('Use this message to sign with your wallet for social verification'));
    }
  } else {
    console.log(result.canonical_message);
    
    if (result.signature && !jsonOutput) {
      console.log('');
      console.log('Signature:', result.signature.signature);
      console.log('Wallet:', result.signature.wallet_address);
    }
  }
}

async function main() {
  const program = new Command();

  program
    .name('create-canonical-message')
    .description('Generate canonical message for social account verification')
    .version('1.0.0')
    .arguments('[discord_id]')
    .option('-x, --x-id <id>', 'Twitter/X user ID (optional)')
    .option('-d, --domain <domain>', 'Domain to use', 'sparta')
    .option('-k, --private-key <key>', 'Private key to sign the message (optional)')
    .option('-v, --verbose', 'Verbose output', false)
    .option('--json', 'Output in JSON format', false)
    .helpOption('-h, --help', 'Show help information')
    .addHelpText('after', `
Examples:
  $ bun run create_canonical_message.ts 123456789012345678
  $ bun run create_canonical_message.ts -x 987654321 123456789012345678
  $ bun run create_canonical_message.ts --domain custom-domain.xyz 123456789012345678
  $ bun run create_canonical_message.ts --json 123456789012345678
  $ bun run create_canonical_message.ts -k 0x1234...abcd 123456789012345678
  
The canonical message format is:
  link-socials::discord=ID;x=ID;nonce=UUID;domain=DOMAIN;timestamp=UNIX
`);

  program.parse();

  const discordId = program.args[0];
  const options = program.opts();

  if (!discordId) {
    program.help();
    process.exit(0);
  }

  // Validate Discord ID
  if (!validateDiscordId(discordId)) {
    console.warn(chalk.yellow(`Warning: Discord ID '${discordId}' doesn't match expected format (17-19 digits)`));
  }

  // Validate X ID if provided
  if (options.xId && !validateXId(options.xId)) {
    console.warn(chalk.yellow(`Warning: X ID '${options.xId}' should be numeric`));
  }

  // Validate private key if provided
  if (options.privateKey && !validatePrivateKey(options.privateKey)) {
    console.error(chalk.red('Error: Invalid private key format. Expected 64 hex characters (with or without 0x prefix)'));
    process.exit(1);
  }

  // Generate message components
  const timestamp = Math.floor(Date.now() / 1000);
  const components: MessageComponents = {
    discord_id: discordId,
    x_id: options.xId,
    nonce: randomUUID(),
    domain: options.domain,
    timestamp
  };

  const canonicalMessage = generateCanonicalMessage(components);

  // Build result object
  const result: GeneratedMessage = {
    canonical_message: canonicalMessage,
    components: {
      ...components,
      timestamp_iso: new Date(timestamp * 1000).toISOString()
    },
    expiry: {
      timestamp: timestamp + 300,
      timestamp_iso: new Date((timestamp + 300) * 1000).toISOString(),
      expires_in_seconds: 300
    }
  };

  // Sign message if private key provided
  if (options.privateKey) {
    try {
      result.signature = await signMessage(canonicalMessage, options.privateKey);
    } catch (error) {
      console.error(chalk.red('Error signing message:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }

  formatOutput(result, options.verbose, options.json);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  process.exit(1);
}); 