# Documentation Suggestions Tool

A Claude-powered tool that scans the `aztec-packages` repository for source code changes and generates suggestions for documentation updates.

## Overview

This tool addresses a common DevRel challenge: keeping documentation in sync with rapidly evolving source code. It:

1. **Scans** recent commits in `aztec-packages` for file changes
2. **Identifies** documentation files that reference those changed files
3. **Analyzes** the changes using Claude to determine if docs need updating
4. **Generates** a prioritized markdown report with specific suggestions

The output is designed to be fed directly to Claude Code for making the actual documentation updates.

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    Nightly Cron (2 AM UTC)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GitHub Scanner                                                 │
│  - Fetches commits from configured branch (default: next)       │
│  - Gets file changes and associated PRs                         │
│  - Scans docs/ directory for `references:` frontmatter          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Reference Analyzer                                             │
│  - Matches changed files to doc references                      │
│  - Identifies stale docs (source newer than doc)                │
│  - Calculates staleness metrics                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Claude Analysis                                                │
│  - Reviews source diff + current doc content                    │
│  - Determines if update is needed                               │
│  - Generates specific update suggestions                        │
│  - Assigns priority (high/medium/low)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Report Generator                                               │
│  - Creates markdown report grouped by priority                  │
│  - Includes copy-paste sections for Claude Code                 │
│  - Saves to reports/ directory                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Documentation References

The tool relies on documentation files having a `references` field in their YAML frontmatter:

```markdown
---
title: CLI Reference
references: ["yarn-project/aztec/src/cli/cli.ts", "yarn-project/aztec/src/cli/cmds/*.ts"]
---

# CLI Reference

...
```

When files matching these references change, the tool flags the documentation for review.

## Installation

```bash
cd tooling/doc-suggestions
npm install
```

## Usage

### Local Development

```bash
# Set required environment variables
export GITHUB_TOKEN="ghp_your_token_here"
export ANTHROPIC_API_KEY="sk-ant-your_key_here"

# Optional: customize settings
export LOOKBACK_DAYS=14    # Default: 7 days
export BRANCH=next         # Default: next (aztec-packages main branch)

# Run the tool
npx tsx src/index.ts
```

### GitHub Actions

The tool runs automatically via GitHub Actions:

- **Schedule**: Daily at 2 AM UTC
- **Manual**: Trigger via Actions tab with optional lookback days parameter

Reports are:
1. Uploaded as workflow artifacts (retained 30 days)
2. Committed to the `reports/` directory in the repo

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | - | GitHub API token for reading aztec-packages |
| `ANTHROPIC_API_KEY` | Yes | - | Claude API key for generating suggestions |
| `LOOKBACK_DAYS` | No | `7` | Number of days to scan for changes |
| `OUTPUT_DIR` | No | `./reports` | Directory for output reports |
| `REPO` | No | `aztec-packages` | Repository to scan |
| `BRANCH` | No | `next` | Branch to scan (aztec-packages uses `next` as main) |

## Output Format

Reports are generated as markdown files with the following structure:

```markdown
# Documentation Update Suggestions

Generated: 2024-01-15T02:00:00Z
Scan period: Last 7 days

## Summary
- High priority: 2
- Medium priority: 3
- Low priority: 1

## Suggestions

### High Priority

#### `docs/docs-network/reference/cli_reference.md`

**Source file**: `yarn-project/aztec/src/cli/cli.ts`
**Related PR**: #12345

**What changed**: A new `--network` CLI flag was added...

**Suggested updates**:
- Add `--network` flag to the CLI reference table
- Include description of valid network values
```

## Using Suggestions with Claude Code

1. Open the generated report
2. Find a suggestion you want to address
3. Expand the "Copy for Claude Code" section
4. Open Claude Code in the `aztec-packages` repo
5. Paste the suggestion and ask Claude to make the update

Example prompt:
```
The following documentation needs updating based on source code changes:

Documentation file: docs/docs-network/reference/cli_reference.md
Source file: yarn-project/aztec/src/cli/cli.ts
Related PR: https://github.com/AztecProtocol/aztec-packages/pull/12345

What changed: A new --network CLI flag was added with options for selecting the target network.

Please make these updates to the documentation:
- Add --network flag to the CLI reference table
- Include description of valid network values
- Add example usage showing network selection
```

## Priority Levels

| Priority | Criteria |
|----------|----------|
| **High** | Breaking changes, new required parameters, security-related changes, major feature additions |
| **Medium** | New optional features, changed defaults, significant API changes |
| **Low** | Minor changes, internal refactoring visible to users, cosmetic changes |

## Cost Estimation

- **Model**: Claude Sonnet
- **Per suggestion**: ~$0.015
- **Typical nightly run**: 5-15 suggestions
- **Estimated monthly cost**: $2-10

## Expanding Coverage

To make this tool more useful, add `references` frontmatter to more documentation files in `aztec-packages`. The tool scans all markdown files in the `docs/` directory.

High-value targets for adding references:
- CLI reference documentation → reference the CLI source files
- API documentation → reference the API implementation files
- Tutorial/guide code examples → reference the example source files

## Architecture

```
src/
├── index.ts              # Entry point, orchestrates the pipeline
├── github-scanner.ts     # GitHub API interactions
├── reference-analyzer.ts # Staleness detection logic
├── claude-client.ts      # Claude API wrapper
└── report-generator.ts   # Markdown report generation
```

## Troubleshooting

### No suggestions generated

- Check that docs have `references:` frontmatter
- Verify the referenced files exist and have recent changes
- Ensure `LOOKBACK_DAYS` covers the period of changes
- Verify `BRANCH` is set correctly (default: `next` for aztec-packages)

### 404 errors when scanning

- Ensure the `BRANCH` environment variable matches the repository's main branch
- For aztec-packages, use `BRANCH=next` (the default)

### Rate limiting

- GitHub API: The tool fetches commit details sequentially to avoid rate limits
- Claude API: 500ms delay between suggestions

### Authentication errors

- `GITHUB_TOKEN`: For fine-grained PATs (starting with `github_pat_`), ensure "Contents: Read" permission is granted for the target repository
- `ANTHROPIC_API_KEY`: Must be a valid Claude API key

## Future Enhancements

- Slack/Discord notifications for high-priority items
- Dashboard showing suggestion trends
- Auto-expand references by analyzing `#include_code` macros
- Optional PR comments for teams that want direct integration
