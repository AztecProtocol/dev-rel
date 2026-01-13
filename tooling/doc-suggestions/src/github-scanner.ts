/**
 * GitHub Scanner - Scans aztec-packages repository for recent changes
 * to files that are referenced by documentation.
 */

export interface RecentChange {
  sha: string;
  date: string;
  author: string;
  message: string;
  files: ChangedFile[];
  pr_number?: number;
  pr_title?: string;
}

export interface ChangedFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface DocReference {
  docPath: string;
  references: string[];
  lastModified?: string;
}

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
}

interface GitHubCommitDetail {
  sha: string;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

interface GitHubPR {
  number: number;
  title: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
}

export class GitHubScanner {
  private baseUrl = 'https://api.github.com';
  private owner = 'AztecProtocol';

  constructor(
    private token: string,
    private repo: string = 'aztec-packages',
    private lookbackDays: number = 7,
    private branch: string = 'next'
  ) {}

  private async fetch<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'doc-suggestions-scanner',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const rateLimit = response.headers.get('x-ratelimit-remaining');
      const rateLimitReset = response.headers.get('x-ratelimit-reset');

      let errorMsg = `GitHub API error: ${response.status} ${response.statusText}`;
      if (errorBody) {
        errorMsg += `\nResponse: ${errorBody}`;
      }
      if (rateLimit === '0' && rateLimitReset) {
        const resetDate = new Date(parseInt(rateLimitReset) * 1000);
        errorMsg += `\nRate limit exceeded. Resets at: ${resetDate.toISOString()}`;
      }
      throw new Error(errorMsg);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get recent commits from the repository
   */
  async getRecentCommits(): Promise<RecentChange[]> {
    const since = new Date();
    since.setDate(since.getDate() - this.lookbackDays);

    console.log(`Fetching commits since ${since.toISOString()}...`);

    const commits = await this.fetch<GitHubCommit[]>(
      `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits?sha=${this.branch}&since=${since.toISOString()}&per_page=100`
    );

    console.log(`Found ${commits.length} commits`);

    // Enrich commits with file information and PR data
    const enrichedCommits = await this.enrichCommits(commits);

    return enrichedCommits;
  }

  /**
   * Enrich commits with file changes and PR information
   */
  private async enrichCommits(commits: GitHubCommit[]): Promise<RecentChange[]> {
    const enriched: RecentChange[] = [];

    for (const commit of commits) {
      try {
        // Get detailed commit info including files
        const detail = await this.fetch<GitHubCommitDetail>(
          `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits/${commit.sha}`
        );

        // Try to find associated PR
        const pr = await this.findAssociatedPR(commit.sha);

        const files: ChangedFile[] = (detail.files || []).map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch,
        }));

        enriched.push({
          sha: commit.sha,
          date: commit.commit.author.date,
          author: commit.commit.author.name,
          message: commit.commit.message.split('\n')[0], // First line only
          files,
          pr_number: pr?.number,
          pr_title: pr?.title,
        });
      } catch (error) {
        console.warn(`Failed to enrich commit ${commit.sha}:`, error);
      }
    }

    return enriched;
  }

  /**
   * Find the PR associated with a commit
   */
  private async findAssociatedPR(sha: string): Promise<GitHubPR | null> {
    try {
      const prs = await this.fetch<GitHubPR[]>(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits/${sha}/pulls`
      );

      return prs.length > 0 ? prs[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get all documentation files that have references frontmatter
   */
  async getDocReferences(): Promise<DocReference[]> {
    console.log('Scanning for documentation files with references...');

    // Get all markdown files in docs directories
    const docPaths = await this.findDocFiles();
    const references: DocReference[] = [];

    for (const path of docPaths) {
      try {
        const content = await this.getFileContent(path);
        const refs = this.parseReferences(content);

        if (refs.length > 0) {
          const lastModified = await this.getFileLastModified(path);
          references.push({
            docPath: path,
            references: refs,
            lastModified,
          });
        }
      } catch (error) {
        // File might not exist or be inaccessible
        console.warn(`Failed to process ${path}:`, error);
      }
    }

    console.log(`Found ${references.length} docs with references`);
    return references;
  }

  /**
   * Find all markdown files in documentation directories
   */
  private async findDocFiles(): Promise<string[]> {
    const docPaths: string[] = [];

    // Try to scan the entire docs directory recursively
    try {
      console.log(`  Scanning docs/ directory on branch '${this.branch}'...`);
      const tree = await this.fetch<{ tree: GitHubTreeItem[] }>(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/git/trees/${this.branch}:docs?recursive=1`
      );

      for (const item of tree.tree) {
        if (item.type === 'blob' && item.path.endsWith('.md')) {
          docPaths.push(`docs/${item.path}`);
        }
      }

      console.log(`  Found ${docPaths.length} markdown files in docs/`);
    } catch (error) {
      console.warn(`Failed to scan docs/:`, error);
    }

    return docPaths;
  }

  /**
   * Get file content from the repository
   */
  async getFileContent(path: string): Promise<string> {
    const response = await this.fetch<{ content: string; encoding: string }>(
      `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`
    );

    if (response.encoding === 'base64') {
      return Buffer.from(response.content, 'base64').toString('utf-8');
    }

    return response.content;
  }

  /**
   * Get the last modified date of a file
   */
  private async getFileLastModified(path: string): Promise<string | undefined> {
    try {
      const commits = await this.fetch<GitHubCommit[]>(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits?path=${path}&sha=${this.branch}&per_page=1`
      );

      return commits.length > 0 ? commits[0].commit.author.date : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parse references from markdown frontmatter
   */
  private parseReferences(content: string): string[] {
    // Match YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return [];
    }

    const frontmatter = frontmatterMatch[1];

    // Look for references field
    const referencesMatch = frontmatter.match(/references:\s*\[([\s\S]*?)\]/);
    if (!referencesMatch) {
      return [];
    }

    // Parse the array of references
    const refsString = referencesMatch[1];
    const refs = refsString
      .split(',')
      .map((ref) => ref.trim().replace(/['"]/g, ''))
      .filter((ref) => ref.length > 0);

    return refs;
  }

  /**
   * Get the diff for a specific file between two commits
   */
  async getFileDiff(path: string, baseSha: string, headSha: string = 'HEAD'): Promise<string> {
    try {
      const comparison = await this.fetch<{ files?: Array<{ filename: string; patch?: string }> }>(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/compare/${baseSha}...${headSha}`
      );

      const file = comparison.files?.find((f) => f.filename === path);
      return file?.patch || '';
    } catch {
      return '';
    }
  }
}
