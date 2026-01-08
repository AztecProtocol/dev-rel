#!/usr/bin/env node
/**
 * Documentation Suggestions Tool
 *
 * Scans aztec-packages for recent changes to files referenced by documentation,
 * then generates suggestions for documentation updates using Claude.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { GitHubScanner } from './github-scanner.js';
import { findStaleReferences, getChangeStatistics } from './reference-analyzer.js';
import { ClaudeClient } from './claude-client.js';
import { generateReport, generateReportFilename, generateNotificationSummary } from './report-generator.js';

interface Config {
  githubToken: string;
  anthropicApiKey: string;
  lookbackDays: number;
  outputDir: string;
  repo: string;
  branch: string;
}

function loadConfig(): Config {
  const githubToken = process.env.GITHUB_TOKEN;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const lookbackDays = parseInt(process.env.LOOKBACK_DAYS || '7', 10);
  const outputDir = process.env.OUTPUT_DIR || './reports';
  const repo = process.env.REPO || 'aztec-packages';
  const branch = process.env.BRANCH || 'next';

  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return {
    githubToken,
    anthropicApiKey,
    lookbackDays,
    outputDir,
    repo,
    branch,
  };
}

async function main() {
  console.log('=== Documentation Suggestions Tool ===\n');

  // Load configuration
  const config = loadConfig();
  console.log(`Configuration:`);
  console.log(`  Repository: ${config.repo}`);
  console.log(`  Branch: ${config.branch}`);
  console.log(`  Lookback period: ${config.lookbackDays} days`);
  console.log(`  Output directory: ${config.outputDir}\n`);

  // Initialize clients
  const scanner = new GitHubScanner(config.githubToken, config.repo, config.lookbackDays, config.branch);
  const claude = new ClaudeClient(config.anthropicApiKey);

  // Step 1: Get recent commits
  console.log('Step 1: Fetching recent commits...');
  const recentChanges = await scanner.getRecentCommits();
  const stats = getChangeStatistics(recentChanges);
  console.log(`  Found ${stats.totalCommits} commits, ${stats.totalFilesChanged} files changed`);
  console.log(`  ${stats.uniqueAuthors} authors, ${stats.prsIncluded} PRs\n`);

  if (recentChanges.length === 0) {
    console.log('No recent changes found. Exiting.');
    return;
  }

  // Step 2: Get documentation references
  console.log('Step 2: Scanning documentation for references...');
  const docReferences = await scanner.getDocReferences();
  console.log(`  Found ${docReferences.length} docs with references\n`);

  if (docReferences.length === 0) {
    console.log('No documentation with references found.');
    console.log('Consider adding `references: ["path/to/file"]` frontmatter to docs.\n');

    // Still generate a report (empty)
    await generateEmptyReport(config);
    return;
  }

  // Step 3: Find stale references
  console.log('Step 3: Analyzing for stale references...');
  const analysisResult = findStaleReferences(docReferences, recentChanges);
  console.log(`  Found ${analysisResult.staleReferences.length} potentially stale references\n`);

  if (analysisResult.staleReferences.length === 0) {
    console.log('All documentation is up to date!');
    await generateEmptyReport(config);
    return;
  }

  // Step 4: Generate suggestions with Claude
  console.log('Step 4: Generating suggestions with Claude...');
  const suggestions = await claude.generateSuggestions(
    analysisResult.staleReferences,
    async (filePath) => scanner.getFileContent(filePath),
    async (filePath) => {
      // Get diff from the oldest change date
      const oldestChange = analysisResult.staleReferences
        .flatMap((r) => r.recentSourceChanges)
        .reduce((oldest, change) => {
          const changeDate = new Date(change.date);
          const oldestDate = oldest ? new Date(oldest.date) : new Date();
          return changeDate < oldestDate ? change : oldest;
        });

      if (oldestChange) {
        return scanner.getFileDiff(filePath, `${oldestChange.sha}~1`, 'HEAD');
      }
      return '';
    }
  );

  console.log(`\n  Generated ${suggestions.length} suggestions\n`);

  // Step 5: Generate report
  console.log('Step 5: Generating report...');
  const scanDate = new Date();
  const report = generateReport(suggestions, {
    scanDate,
    lookbackDays: config.lookbackDays,
    analysisResult,
  });

  // Ensure output directory exists
  await fs.mkdir(config.outputDir, { recursive: true });

  // Write timestamped report
  const filename = generateReportFilename(scanDate);
  const filepath = path.join(config.outputDir, filename);
  await fs.writeFile(filepath, report, 'utf-8');
  console.log(`  Written to: ${filepath}`);

  // Also write a "latest" report for easy access
  const latestPath = path.join(config.outputDir, 'latest.md');
  await fs.writeFile(latestPath, report, 'utf-8');
  console.log(`  Latest report: ${latestPath}\n`);

  // Print summary
  const summary = generateNotificationSummary(suggestions);
  console.log('=== Summary ===');
  console.log(summary);
  console.log('\nDone!');
}

async function generateEmptyReport(config: Config) {
  const scanDate = new Date();
  const report = generateReport([], {
    scanDate,
    lookbackDays: config.lookbackDays,
    analysisResult: {
      staleReferences: [],
      totalDocsAnalyzed: 0,
      totalReferencesChecked: 0,
      scanPeriodDays: config.lookbackDays,
    },
  });

  await fs.mkdir(config.outputDir, { recursive: true });

  const filename = generateReportFilename(scanDate);
  const filepath = path.join(config.outputDir, filename);
  await fs.writeFile(filepath, report, 'utf-8');
  console.log(`Empty report written to: ${filepath}`);

  const latestPath = path.join(config.outputDir, 'latest.md');
  await fs.writeFile(latestPath, report, 'utf-8');
}

// Run the main function
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
