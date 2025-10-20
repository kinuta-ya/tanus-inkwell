import { create } from 'zustand';
import type { Repository } from '../types';
import { repositoryService, type GitHubTreeItem } from '../services/github/repository.service';
import { db, type StoredFile } from '../db/schema';

interface RepositoryState {
  repositories: Repository[];
  currentRepository: Repository | null;
  isLoading: boolean;
  error: string | null;
}

interface RepositoryActions {
  fetchRepositories: (token: string) => Promise<void>;
  setCurrentRepository: (repo: Repository | null) => void;
  clearError: () => void;
  syncRepository: (token: string, repo: Repository) => Promise<void>;
}

type RepositoryStore = RepositoryState & RepositoryActions;

export const useRepositoryStore = create<RepositoryStore>((set, get) => ({
  // State
  repositories: [],
  currentRepository: null,
  isLoading: false,
  error: null,

  // Actions
  fetchRepositories: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const repos = await repositoryService.getRepositories(token);
      set({ repositories: repos, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch repositories',
        isLoading: false,
      });
    }
  },

  setCurrentRepository: (repo: Repository | null) => {
    set({ currentRepository: repo });
  },

  clearError: () => {
    set({ error: null });
  },

  syncRepository: async (token: string, repo: Repository) => {
    set({ isLoading: true, error: null });
    try {
      const [owner, repoName] = repo.fullName.split('/');
      console.log(`[Sync] Starting sync for ${repo.fullName} (repoId: ${repo.id})`);

      // Fetch repository tree
      const tree = await repositoryService.getRepositoryTree(token, owner, repoName);
      console.log(`[Sync] Fetched tree with ${tree.length} items`);

      // Filter only files (not directories) and markdown files
      const markdownFiles = tree.filter(
        (item: GitHubTreeItem) =>
          item.type === 'blob' &&
          (item.path.endsWith('.md') || item.path.endsWith('.markdown'))
      );
      console.log(`[Sync] Found ${markdownFiles.length} Markdown files`);
      console.log('[Sync] Markdown files:', markdownFiles.map(f => f.path));

      // Save repository to DB
      await db.repositories.put({
        ...repo,
        lastSync: new Date().toISOString(),
        fileCount: markdownFiles.length,
      });
      console.log(`[Sync] Saved repository to DB`);

      // Fetch and save file contents
      let savedCount = 0;
      for (const file of markdownFiles) {
        try {
          console.log(`[Sync] Fetching file: ${file.path}`);
          const fileContent = await repositoryService.getFileContent(
            token,
            owner,
            repoName,
            file.path
          );

          const storedFile: StoredFile = {
            id: `${repo.id}-${file.path}`,
            repoId: repo.id,
            path: file.path,
            content: fileContent.content,
            lastModified: new Date().toISOString(),
            isDirty: false,
            githubSha: file.sha,
            size: file.size || 0,
          };

          await db.files.put(storedFile);
          console.log(`[Sync] Saved file to DB: ${file.path} (repoId: ${repo.id})`);
          savedCount++;
        } catch (error) {
          console.error(`Failed to sync file ${file.path}:`, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }
      console.log(`[Sync] Sync complete. Saved ${savedCount} / ${markdownFiles.length} files`)

      // Update repositories list
      const updatedRepos = get().repositories.map((r) =>
        r.id === repo.id
          ? { ...r, lastSync: new Date().toISOString(), fileCount: savedCount }
          : r
      );

      set({ repositories: updatedRepos, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sync repository',
        isLoading: false,
      });
      throw error;
    }
  },
}));
