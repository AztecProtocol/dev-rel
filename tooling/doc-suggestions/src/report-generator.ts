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
Lookback: ${lookbackDays} days | Docs analyzed: ${analysisResult.totalDocsAnalyzed} | References: ${analysisResult.totalReferencesChecked} | Stale: ${analysisResult.staleReferences.length}

**Suggestions**: ${high.length} high, ${medium.length} medium, ${low.length} low

---

`;

  if (suggestions.length === 0) {
    report += `## No Suggestions

No documentation updates needed at this time.

`;

    // Show what was analyzed even when no updates needed
    if (analysisResult.staleReferences.length > 0) {
      report += `### Reviewed References

The following documentation files were flagged for review but determined to not need updates:

| Documentation | Referenced Source | Reason |
|--------------|-------------------|--------|
`;
      for (const ref of analysisResult.staleReferences) {
        const prLink = ref.recentSourceChanges.find((c) => c.pr_number)?.pr_number;
        const prText = prLink ? `PR #${prLink}` : 'Recent commits';
        report += `| \`${ref.docPath}\` | \`${ref.sourceFile}\` | ${prText} - no user-facing changes |
`;
      }
      report += `
`;
    }

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

**Source**: \`${s.sourceFile}\` | **PR**: ${prLink ? `[${s.relevantPr}](${prLink})` : 'N/A'} | **Confidence**: ${Math.round(s.confidence * 100)}%

${s.changeSummary}

**Updates needed**:
${s.suggestedUpdates.map((u) => `- ${u}`).join('\n')}

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
