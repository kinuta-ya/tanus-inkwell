import { create } from 'zustand';
import { db, type StoredFile } from '../db/schema';
import { repositoryService } from '../services/github/repository.service';
import type { Repository } from '../types';

interface SyncState {
  isPushing: boolean;
  pushProgress: number;
  pushTotal: number;
  isPulling: boolean;
  pullProgress: number;
  pullTotal: number;
  error: string | null;
}

interface SyncActions {
  pushChanges: (
    token: string,
    repo: Repository,
    files: StoredFile[],
    commitMessage: string
  ) => Promise<void>;
  pullChanges: (
    token: string,
    repo: Repository,
    currentFiles: StoredFile[]
  ) => Promise<{ updated: number; conflicts: StoredFile[] }>;
  clearError: () => void;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set) => ({
  // State
  isPushing: false,
  pushProgress: 0,
  pushTotal: 0,
  isPulling: false,
  pullProgress: 0,
  pullTotal: 0,
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

  pullChanges: async (
    token: string,
    repo: Repository,
    currentFiles: StoredFile[]
  ) => {
    set({ isPulling: true, pullProgress: 0, pullTotal: 0, error: null });

    const [owner, repoName] = repo.fullName.split('/');
    const conflicts: StoredFile[] = [];
    let updatedCount = 0;

    try {
      // Get the latest tree from GitHub
      console.log('[Pull] Fetching repository tree from GitHub...');
      const tree = await repositoryService.getRepositoryTree(token, owner, repoName);

      // Filter only files (not directories)
      const remoteFiles = tree.filter((item) => item.type === 'blob');

      set({ pullTotal: remoteFiles.length });
      console.log(`[Pull] Found ${remoteFiles.length} files in remote repository`);

      // Create a map of current files for quick lookup
      const currentFileMap = new Map(
        currentFiles.map((f) => [f.path, f])
      );

      // Process each remote file
      for (let i = 0; i < remoteFiles.length; i++) {
        const remoteFile = remoteFiles[i];
        const localFile = currentFileMap.get(remoteFile.path);

        try {
          // Check if file needs to be updated
          if (!localFile || localFile.githubSha !== remoteFile.sha) {
            // Check for conflicts (local file is dirty and remote has changed)
            if (localFile?.isDirty && localFile.githubSha !== remoteFile.sha) {
              console.log(`[Pull] Conflict detected: ${remoteFile.path}`);
              conflicts.push(localFile);
              set({ pullProgress: i + 1 });
              continue;
            }

            // Fetch the file content from GitHub
            console.log(`[Pull] Updating file: ${remoteFile.path}`);
            const fileContent = await repositoryService.getFileContent(
              token,
              owner,
              repoName,
              remoteFile.path
            );

            // Update or create the file in IndexedDB
            if (localFile) {
              await db.files.update(localFile.id, {
                content: fileContent.content,
                githubSha: fileContent.sha,
                size: fileContent.size,
                isDirty: false,
                lastModified: new Date().toISOString(),
              });
            } else {
              await db.files.add({
                id: `${repo.id}-${remoteFile.path}`,
                repoId: repo.id,
                path: remoteFile.path,
                content: fileContent.content,
                githubSha: fileContent.sha,
                size: fileContent.size,
                isDirty: false,
                lastModified: new Date().toISOString(),
              });
            }

            updatedCount++;
            console.log(`[Pull] Updated: ${remoteFile.path}`);
          }

          set({ pullProgress: i + 1 });
        } catch (error) {
          console.error(`[Pull] Failed to pull ${remoteFile.path}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Update repository's lastSync timestamp
      await db.repositories.update(repo.id, {
        lastSync: new Date().toISOString(),
      });

      console.log(`[Pull] Pull complete. ${updatedCount} files updated, ${conflicts.length} conflicts`);
      set({ isPulling: false, pullProgress: 0, pullTotal: 0 });

      return { updated: updatedCount, conflicts };
    } catch (error) {
      set({
        isPulling: false,
        pullProgress: 0,
        pullTotal: 0,
        error: error instanceof Error ? error.message : 'Pull failed',
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
