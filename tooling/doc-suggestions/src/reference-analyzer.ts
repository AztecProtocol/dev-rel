/**
 * Reference Analyzer - Determines which documentation files need attention
 * based on recent changes to their referenced source files.
 */

import type { RecentChange, DocReference } from './github-scanner.js';

export interface StaleReference {
  docPath: string;
  sourceFile: string;
  lastDocUpdate: string | undefined;
  recentSourceChanges: RecentChange[];
  stalenessDays: number;
}

export interface AnalysisResult {
  staleReferences: StaleReference[];
  totalDocsAnalyzed: number;
  totalReferencesChecked: number;
  scanPeriodDays: number;
}

/**
 * Find documentation that may be stale due to recent source code changes
 */
export function findStaleReferences(
  docReferences: DocReference[],
  recentChanges: RecentChange[]
): AnalysisResult {
  const staleReferences: StaleReference[] = [];
  let totalReferencesChecked = 0;

  // Build a map of changed files to their changes for quick lookup
  const fileChangesMap = buildFileChangesMap(recentChanges);

  for (const doc of docReferences) {
    for (const refPath of doc.references) {
      totalReferencesChecked++;

      // Check if any changed file matches this reference
      const matchingChanges = findMatchingChanges(refPath, fileChangesMap);

      if (matchingChanges.length > 0) {
        // Check if doc was updated after the source changes
        const isStale = checkIfStale(doc.lastModified, matchingChanges);

        if (isStale) {
          const stalenessDays = calculateStalenessDays(doc.lastModified, matchingChanges);

          staleReferences.push({
            docPath: doc.docPath,
            sourceFile: refPath,
            lastDocUpdate: doc.lastModified,
            recentSourceChanges: matchingChanges,
            stalenessDays,
          });
        }
      }
    }
  }

  // Sort by staleness (most stale first)
  staleReferences.sort((a, b) => b.stalenessDays - a.stalenessDays);

  // Deduplicate - keep only the most stale entry per doc
  const uniqueStaleRefs = deduplicateByDoc(staleReferences);

  return {
    staleReferences: uniqueStaleRefs,
    totalDocsAnalyzed: docReferences.length,
    totalReferencesChecked,
    scanPeriodDays: 7, // Default lookback period
  };
}

/**
 * Build a map from file paths to their recent changes
 */
function buildFileChangesMap(changes: RecentChange[]): Map<string, RecentChange[]> {
  const map = new Map<string, RecentChange[]>();

  for (const change of changes) {
    for (const file of change.files) {
      const existing = map.get(file.filename) || [];
      existing.push(change);
      map.set(file.filename, existing);
    }
  }

  return map;
}

/**
 * Find changes that match a reference path (supports glob-like patterns)
 */
function findMatchingChanges(
  refPath: string,
  fileChangesMap: Map<string, RecentChange[]>
): RecentChange[] {
  const matchingChanges: RecentChange[] = [];

  // Normalize the reference path
  const normalizedRef = normalizePath(refPath);

  for (const [filePath, changes] of fileChangesMap) {
    if (pathMatches(normalizedRef, filePath)) {
      matchingChanges.push(...changes);
    }
  }

  // Deduplicate by SHA
  const uniqueChanges = Array.from(
    new Map(matchingChanges.map((c) => [c.sha, c])).values()
  );

  return uniqueChanges;
}

/**
 * Normalize a path for matching
 */
function normalizePath(path: string): string {
  // Remove leading slashes and normalize
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

/**
 * Check if a reference path matches a changed file path
 * Supports basic glob patterns (* and **)
 */
function pathMatches(refPath: string, changedPath: string): boolean {
  // Exact match
  if (refPath === changedPath) {
    return true;
  }

  // Handle glob patterns
  if (refPath.includes('*')) {
    const regex = globToRegex(refPath);
    return regex.test(changedPath);
  }

  // Check if ref is a prefix (directory reference)
  if (changedPath.startsWith(refPath + '/')) {
    return true;
  }

  // Check if ref ends with the changed path (relative reference)
  if (changedPath.endsWith(refPath)) {
    return true;
  }

  return false;
}

/**
 * Convert a glob pattern to a regex
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*\*/g, '{{GLOBSTAR}}') // Temporarily replace **
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/{{GLOBSTAR}}/g, '.*'); // ** matches anything

  return new RegExp(`^${escaped}$`);
}

/**
 * Check if documentation is stale compared to source changes
 */
function checkIfStale(
  docLastModified: string | undefined,
  sourceChanges: RecentChange[]
): boolean {
  if (!docLastModified) {
    // If we don't know when doc was last modified, assume it might be stale
    return true;
  }

  const docDate = new Date(docLastModified);

  // Check if any source change is newer than the doc
  for (const change of sourceChanges) {
    const changeDate = new Date(change.date);
    if (changeDate > docDate) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate how many days the documentation is stale
 */
function calculateStalenessDays(
  docLastModified: string | undefined,
  sourceChanges: RecentChange[]
): number {
  if (!docLastModified || sourceChanges.length === 0) {
    return 0;
  }

  const docDate = new Date(docLastModified);

  // Find the most recent source change
  const latestChange = sourceChanges.reduce((latest, change) => {
    const changeDate = new Date(change.date);
    const latestDate = new Date(latest.date);
    return changeDate > latestDate ? change : latest;
  });

  const latestChangeDate = new Date(latestChange.date);
  const diffMs = latestChangeDate.getTime() - docDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Deduplicate stale references, keeping the most stale entry per doc
 */
function deduplicateByDoc(staleRefs: StaleReference[]): StaleReference[] {
  const byDoc = new Map<string, StaleReference>();

  for (const ref of staleRefs) {
    const existing = byDoc.get(ref.docPath);
    if (!existing || ref.stalenessDays > existing.stalenessDays) {
      byDoc.set(ref.docPath, ref);
    }
  }

  return Array.from(byDoc.values());
}

/**
 * Get aggregate statistics about source changes
 */
export function getChangeStatistics(changes: RecentChange[]): {
  totalCommits: number;
  totalFilesChanged: number;
  uniqueAuthors: number;
  prsIncluded: number;
} {
  const uniqueAuthors = new Set(changes.map((c) => c.author));
  const prsIncluded = changes.filter((c) => c.pr_number).length;
  const totalFilesChanged = changes.reduce((sum, c) => sum + c.files.length, 0);

  return {
    totalCommits: changes.length,
    totalFilesChanged,
    uniqueAuthors: uniqueAuthors.size,
    prsIncluded,
  };
}
