/**
 * Claude Client - Generates documentation update suggestions using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import type { StaleReference } from './reference-analyzer.js';

export interface DocumentationSuggestion {
  docPath: string;
  sourceFile: string;
  changeSummary: string;
  suggestedUpdates: string[];
  priority: 'high' | 'medium' | 'low';
  relevantPr: string | null;
  confidence: number;
}

interface GenerateSuggestionInput {
  staleRef: StaleReference;
  sourceContent: string;
  docContent: string;
  sourceDiff: string;
}

const SUGGESTION_PROMPT = `You are reviewing documentation for the Aztec Protocol, a privacy-focused Layer 2 blockchain.

A source file has changed but its corresponding documentation may be outdated.

Source file: {source_file}
Documentation: {doc_path}

Recent changes to source (diff):
\`\`\`diff
{source_diff}
\`\`\`

Current documentation content:
\`\`\`markdown
{doc_content}
\`\`\`

Current source file content (for context):
\`\`\`
{source_content}
\`\`\`

Analyze the changes and determine if documentation updates are needed.

Consider:
1. Are there new features, functions, or CLI flags that should be documented?
2. Have any default values, behaviors, or APIs changed?
3. Are there renamed or deprecated items?
4. Do code examples in the docs still work with the new source?

If updates are needed, be specific about:
- Which sections of the documentation need changes
- What specific information should be added, modified, or removed
- Why this change matters to users

Output your analysis in the following JSON format:
{
  "needs_update": true/false,
  "change_summary": "1-2 sentence summary of what changed in the source",
  "suggested_updates": [
    "Specific update 1",
    "Specific update 2"
  ],
  "priority": "high/medium/low",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this priority was assigned"
}

Priority guidelines:
- high: Breaking changes, new required parameters, security-related changes, or major feature additions
- medium: New optional features, changed defaults, or significant API changes
- low: Minor changes, internal refactoring that doesn't affect user-facing behavior, or cosmetic changes

If the changes don't affect documentation (e.g., internal refactoring, test changes), set needs_update to false.`;

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  /**
   * Generate a documentation suggestion for a stale reference
   */
  async generateSuggestion(input: GenerateSuggestionInput): Promise<DocumentationSuggestion | null> {
    const { staleRef, sourceContent, docContent, sourceDiff } = input;

    // Build the prompt
    const prompt = SUGGESTION_PROMPT
      .replace('{source_file}', staleRef.sourceFile)
      .replace('{doc_path}', staleRef.docPath)
      .replace('{source_diff}', sourceDiff || 'No diff available')
      .replace('{doc_content}', truncateContent(docContent, 4000))
      .replace('{source_content}', truncateContent(sourceContent, 3000));

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        console.warn(`No text response for ${staleRef.docPath}`);
        return null;
      }

      // Parse the JSON response
      const analysis = parseAnalysis(textContent.text);
      if (!analysis || !analysis.needs_update) {
        return null;
      }

      // Find the most relevant PR
      const relevantPr = staleRef.recentSourceChanges.find((c) => c.pr_number)?.pr_number;

      return {
        docPath: staleRef.docPath,
        sourceFile: staleRef.sourceFile,
        changeSummary: analysis.change_summary,
        suggestedUpdates: analysis.suggested_updates,
        priority: analysis.priority,
        relevantPr: relevantPr ? `#${relevantPr}` : null,
        confidence: analysis.confidence,
      };
    } catch (error) {
      console.error(`Failed to generate suggestion for ${staleRef.docPath}:`, error);
      return null;
    }
  }

  /**
   * Generate suggestions for multiple stale references
   */
  async generateSuggestions(
    staleRefs: StaleReference[],
    getContent: (path: string) => Promise<string>,
    getDiff: (path: string) => Promise<string>
  ): Promise<DocumentationSuggestion[]> {
    const suggestions: DocumentationSuggestion[] = [];

    console.log(`Generating suggestions for ${staleRefs.length} stale references...`);

    for (const staleRef of staleRefs) {
      try {
        console.log(`  Analyzing ${staleRef.docPath}...`);

        // Fetch content in parallel
        const [sourceContent, docContent, sourceDiff] = await Promise.all([
          getContent(staleRef.sourceFile).catch(() => ''),
          getContent(staleRef.docPath).catch(() => ''),
          getDiff(staleRef.sourceFile).catch(() => ''),
        ]);

        if (!docContent) {
          console.warn(`  Could not fetch doc content for ${staleRef.docPath}`);
          continue;
        }

        const suggestion = await this.generateSuggestion({
          staleRef,
          sourceContent,
          docContent,
          sourceDiff,
        });

        if (suggestion) {
          suggestions.push(suggestion);
          console.log(`  Found ${suggestion.priority} priority update needed`);
        } else {
          console.log(`  No update needed`);
        }

        // Rate limiting - be nice to the API
        await sleep(500);
      } catch (error) {
        console.error(`  Error processing ${staleRef.docPath}:`, error);
      }
    }

    return suggestions;
  }
}

/**
 * Parse the JSON analysis from Claude's response
 */
function parseAnalysis(text: string): {
  needs_update: boolean;
  change_summary: string;
  suggested_updates: string[];
  priority: 'high' | 'medium' | 'low';
  confidence: number;
} | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof parsed.needs_update !== 'boolean') {
      return null;
    }

    return {
      needs_update: parsed.needs_update,
      change_summary: parsed.change_summary || '',
      suggested_updates: Array.isArray(parsed.suggested_updates) ? parsed.suggested_updates : [],
      priority: ['high', 'medium', 'low'].includes(parsed.priority) ? parsed.priority : 'low',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  } catch (error) {
    console.warn('Failed to parse analysis JSON:', error);
    return null;
  }
}

/**
 * Truncate content to a maximum length, keeping the beginning
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + '\n\n[... content truncated ...]';
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
