import type { Octokit } from 'octokit';
import { createOctokitClient } from '../../utils/octokit';
import type { Repository } from '../../types';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  updated_at: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTree {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export type GitHubCompareFileStatus =
  | 'added'
  | 'modified'
  | 'removed'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unchanged';

export interface GitHubCompareFile {
  filename: string;
  status: GitHubCompareFileStatus;
  sha: string;
  previous_filename?: string;
}

class GitHubRepositoryService {
  private getOctokit(token: string): Octokit {
    return createOctokitClient(token);
  }

  /**
   * Get the latest commit SHA for the repository's default branch.
   * Falls back from 'main' to 'master' like getRepositoryTree.
   */
  async getLatestCommit(
    token: string,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<{ branch: string; sha: string }> {
    try {
      const octokit = this.getOctokit(token);
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner,
        repo,
        ref: `heads/${branch}`,
      });
      return { branch, sha: data.object.sha };
    } catch (error) {
      if (branch === 'main') {
        return this.getLatestCommit(token, owner, repo, 'master');
      }
      console.error('Failed to fetch latest commit:', error);
      throw new Error('Failed to fetch latest commit');
    }
  }

  /**
   * Compare two commits and return the list of changed files (added, modified,
   * removed, renamed). Used to pull only the diff since the last sync.
   */
  async compareCommits(
    token: string,
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<GitHubCompareFile[]> {
    try {
      const octokit = this.getOctokit(token);
      const { data } = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
        owner,
        repo,
        basehead: `${base}...${head}`,
      });
      return (data.files ?? []) as GitHubCompareFile[];
    } catch (error) {
      console.error('Failed to compare commits:', error);
      throw new Error('Failed to compare commits');
    }
  }

  /**
   * Get all repositories for the authenticated user
   */
  async getRepositories(token: string): Promise<Repository[]> {
    try {
      const octokit = this.getOctokit(token);
      const { data } = await octokit.request('GET /user/repos', {
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner',
      });

      return data.map((repo) => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        private: repo.private,
        lastSync: null,
        fileCount: 0,
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  /**
   * Get repository tree (file structure)
   */
  async getRepositoryTree(
    token: string,
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<GitHubTreeItem[]> {
    try {
      const octokit = this.getOctokit(token);

      // Get the latest commit SHA for the branch
      const { data: refData } = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
        owner,
        repo,
        ref: `heads/${branch}`,
      });

      const commitSha = refData.object.sha;

      // Get the tree
      const { data: treeData } = await octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
        owner,
        repo,
        tree_sha: commitSha,
        recursive: '1',
      });

      return treeData.tree as GitHubTreeItem[];
    } catch (error) {
      console.error('Failed to fetch repository tree:', error);

      // Try with 'master' branch if 'main' fails
      if (branch === 'main') {
        try {
          return await this.getRepositoryTree(token, owner, repo, 'master');
        } catch (masterError) {
          console.error('Failed to fetch with master branch:', masterError);
          throw new Error('Failed to fetch repository tree');
        }
      }

      throw new Error('Failed to fetch repository tree');
    }
  }

  /**
   * Get file content
   */
  async getFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string
  ): Promise<{ content: string; sha: string; size: number }> {
    try {
      const octokit = this.getOctokit(token);

      console.log(`[GitHub API] Fetching: ${path}`);

      const { data } = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path, // Octokit handles encoding automatically
      });

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error('Path is not a file');
      }

      // Decode base64 content (browser-compatible)
      const content = data.content
        ? decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))))
        : '';

      console.log(`[GitHub API] Success: ${path} (${content.length} chars)`);

      return {
        content,
        sha: data.sha,
        size: data.size,
      };
    } catch (error) {
      console.error('Failed to fetch file content:', {
        path,
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });
      throw error;
    }
  }

  /**
   * Create new file
   */
  async createFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string
  ): Promise<{ sha: string; content: { sha: string } }> {
    try {
      const octokit = this.getOctokit(token);

      console.log(`[GitHub API] Creating new file: ${path}`);

      // Encode content to base64 (browser-compatible)
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      const { data } = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        message,
        content: encodedContent,
        // No sha means creating a new file
      });

      console.log(`[GitHub API] Successfully created: ${path}`);

      return {
        sha: data.commit.sha || '',
        content: { sha: data.content?.sha || '' }
      };
    } catch (error) {
      console.error('Failed to create file:', {
        path,
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });
      throw error;
    }
  }

  /**
   * Update file content
   */
  async updateFileContent(
    token: string,
    owner: string,
    repo: string,
    path: string,
    content: string,
    sha: string,
    message: string
  ): Promise<{ sha: string; content: { sha: string } }> {
    try {
      const octokit = this.getOctokit(token);

      console.log(`[GitHub API] Updating file: ${path}`);

      // Encode content to base64 (browser-compatible)
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      const { data } = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        message,
        content: encodedContent,
        sha,
      });

      console.log(`[GitHub API] Successfully updated: ${path}`);

      return {
        sha: data.commit.sha || '',
        content: { sha: data.content?.sha || '' }
      };
    } catch (error) {
      console.error('Failed to update file content:', {
        path,
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(
    token: string,
    owner: string,
    repo: string,
    path: string,
    sha: string,
    message: string
  ): Promise<void> {
    try {
      const octokit = this.getOctokit(token);

      console.log(`[GitHub API] Deleting file: ${path}`);

      await octokit.request('DELETE /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path,
        message,
        sha,
      });

      console.log(`[GitHub API] Successfully deleted: ${path}`);
    } catch (error) {
      console.error('Failed to delete file:', {
        path,
        error: error instanceof Error ? error.message : String(error),
        response: (error as any)?.response?.data,
        status: (error as any)?.response?.status,
      });
      throw error;
    }
  }
}

export const repositoryService = new GitHubRepositoryService();
