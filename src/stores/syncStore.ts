import { create } from 'zustand';
import { db, type StoredFile } from '../db/schema';
import { repositoryService } from '../services/github/repository.service';
import type { Repository } from '../types';

interface SyncState {
  isPushing: boolean;
  pushProgress: number;
  pushTotal: number;
  error: string | null;
}

interface SyncActions {
  pushChanges: (
    token: string,
    repo: Repository,
    files: StoredFile[],
    commitMessage: string
  ) => Promise<void>;
  clearError: () => void;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set) => ({
  // State
  isPushing: false,
  pushProgress: 0,
  pushTotal: 0,
  error: null,

  // Actions
  pushChanges: async (
    token: string,
    repo: Repository,
    files: StoredFile[],
    commitMessage: string
  ) => {
    const dirtyFiles = files.filter((f) => f.isDirty);

    if (dirtyFiles.length === 0) {
      set({ error: 'No changes to push' });
      return;
    }

    set({ isPushing: true, pushProgress: 0, pushTotal: dirtyFiles.length, error: null });

    const [owner, repoName] = repo.fullName.split('/');
    let successCount = 0;

    try {
      for (let i = 0; i < dirtyFiles.length; i++) {
        const file = dirtyFiles[i];

        try {
          console.log(`[Push] Pushing file ${i + 1}/${dirtyFiles.length}: ${file.path}`);

          let result;

          // Check if this is a new file (empty githubSha) or existing file
          if (!file.githubSha || file.githubSha === '') {
            console.log(`[Push] Creating new file: ${file.path}`);
            result = await repositoryService.createFile(
              token,
              owner,
              repoName,
              file.path,
              file.content,
              commitMessage
            );
          } else {
            console.log(`[Push] Updating existing file: ${file.path}`);
            result = await repositoryService.updateFileContent(
              token,
              owner,
              repoName,
              file.path,
              file.content,
              file.githubSha,
              commitMessage
            );
          }

          // Update the file in DB to mark it as clean and update SHA
          await db.files.update(file.id, {
            isDirty: false,
            githubSha: result.content.sha,
            lastModified: new Date().toISOString(),
          });

          successCount++;
          set({ pushProgress: successCount });

          console.log(`[Push] Successfully pushed: ${file.path} (new SHA: ${result.content.sha})`);
        } catch (error) {
          console.error(`[Push] Failed to push ${file.path}:`, error);
          throw new Error(`Failed to push ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log(`[Push] Push complete. ${successCount}/${dirtyFiles.length} files pushed`);
      set({ isPushing: false, pushProgress: 0, pushTotal: 0 });
    } catch (error) {
      set({
        isPushing: false,
        pushProgress: 0,
        pushTotal: 0,
        error: error instanceof Error ? error.message : 'Push failed',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
