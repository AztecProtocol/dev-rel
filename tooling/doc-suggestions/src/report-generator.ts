/**
 * Report Generator - Creates markdown reports with documentation update suggestions
 */

import type { DocumentationSuggestion } from './claude-client.js';
import type { AnalysisResult } from './reference-analyzer.js';

export interface ReportOptions {
  scanDate: Date;
  lookbackDays: number;
  analysisResult: AnalysisResult;
}

/**
 * Generate a markdown report with all documentation suggestions
 */
export function generateReport(
  suggestions: DocumentationSuggestion[],
  options: ReportOptions
): string {
  const { scanDate, lookbackDays, analysisResult } = options;

  const high = suggestions.filter((s) => s.priority === 'high');
  const medium = suggestions.filter((s) => s.priority === 'medium');
  const low = suggestions.filter((s) => s.priority === 'low');

  let report = `# Documentation Update Suggestions

Generated: ${scanDate.toISOString()}
Scan period: Last ${lookbackDays} days

## Summary

| Metric | Value |
|--------|-------|
| Docs with references analyzed | ${analysisResult.totalDocsAnalyzed} |
| Total references checked | ${analysisResult.totalReferencesChecked} |
| Stale references found | ${analysisResult.staleReferences.length} |
| Suggestions generated | ${suggestions.length} |

### By Priority

- **High priority**: ${high.length}
- **Medium priority**: ${medium.length}
- **Low priority**: ${low.length}

---

## How to Use This Report

1. Review the suggestions below, starting with high priority items
2. For items you want to address, copy the relevant section
3. Open Claude Code in the aztec-packages repo
4. Paste the suggestion and ask Claude to make the changes

### Example prompt for Claude Code:

\`\`\`
The following documentation needs updating based on source code changes:

[paste suggestion section here]

Please update the documentation file to reflect these changes.
\`\`\`

---

`;

  if (suggestions.length === 0) {
    report += `## No Suggestions

No documentation updates needed at this time. All referenced source files are either:
- Unchanged in the scan period
- Already have up-to-date documentation

`;
    return report;
  }

  report += `## Suggestions

`;

  if (high.length > 0) {
    report += `### High Priority

These documentation files may be significantly out of date with breaking changes or new features.

`;
    for (const s of high) {
      report += formatSuggestion(s);
    }
  }

  if (medium.length > 0) {
    report += `### Medium Priority

These documentation files may need updates for new features or changed defaults.

`;
    for (const s of medium) {
      report += formatSuggestion(s);
    }
  }

  if (low.length > 0) {
    report += `### Low Priority

These documentation files may have minor updates needed.

`;
    for (const s of low) {
      report += formatSuggestion(s);
    }
  }

  return report;
}

/**
 * Format a single suggestion as markdown
 */
function formatSuggestion(s: DocumentationSuggestion): string {
  const prLink = s.relevantPr
    ? `https://github.com/AztecProtocol/aztec-packages/pull/${s.relevantPr.replace('#', '')}`
    : null;

  return `#### \`${s.docPath}\`

**Source file**: \`${s.sourceFile}\`
**Related PR**: ${prLink ? `[${s.relevantPr}](${prLink})` : 'N/A'}
**Confidence**: ${Math.round(s.confidence * 100)}%

**What changed**: ${s.changeSummary}

**Suggested updates**:
${s.suggestedUpdates.map((u) => `- ${u}`).join('\n')}

<details>
<summary>Copy for Claude Code</summary>

\`\`\`
Documentation file: ${s.docPath}
Source file: ${s.sourceFile}
${prLink ? `Related PR: ${prLink}` : ''}

What changed: ${s.changeSummary}

Please make these updates to the documentation:
${s.suggestedUpdates.map((u) => `- ${u}`).join('\n')}
\`\`\`

</details>

---

`;
}

/**
 * Generate a filename for the report
 */
export function generateReportFilename(date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `doc-suggestions-${dateStr}.md`;
}

/**
 * Generate a summary for Slack/Discord notification
 */
export function generateNotificationSummary(suggestions: DocumentationSuggestion[]): string {
  const high = suggestions.filter((s) => s.priority === 'high').length;
  const medium = suggestions.filter((s) => s.priority === 'medium').length;
  const low = suggestions.filter((s) => s.priority === 'low').length;
  const total = suggestions.length;

  if (total === 0) {
    return 'No documentation updates needed today.';
  }

  const parts = [];
  if (high > 0) parts.push(`${high} high`);
  if (medium > 0) parts.push(`${medium} medium`);
  if (low > 0) parts.push(`${low} low`);

  return `Documentation scan complete: ${total} updates suggested (${parts.join(', ')})`;
}
