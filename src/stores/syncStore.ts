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
    let lastCommitSha = '';

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

          // The PUT contents response carries the resulting HEAD commit SHA.
          lastCommitSha = result.sha || lastCommitSha;

          successCount++;
          set({ pushProgress: successCount });

          console.log(`[Push] Successfully pushed: ${file.path} (new SHA: ${result.content.sha})`);
        } catch (error) {
          console.error(`[Push] Failed to push ${file.path}:`, error);
          throw new Error(`Failed to push ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Advance the synced commit so a later pull diffs from after this push.
      if (lastCommitSha) {
        await db.repositories.update(repo.id, { lastSyncCommitSha: lastCommitSha });
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

    // Helper: fetch a remote file and upsert it into IndexedDB.
    const upsertFile = async (path: string, localFile?: StoredFile) => {
      const fileContent = await repositoryService.getFileContent(token, owner, repoName, path);
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
          id: `${repo.id}-${path}`,
          repoId: repo.id,
          path,
          content: fileContent.content,
          githubSha: fileContent.sha,
          size: fileContent.size,
          isDirty: false,
          lastModified: new Date().toISOString(),
        });
      }
    };

    try {
      // Resolve the current HEAD commit and the commit we last synced from.
      const { sha: headSha } = await repositoryService.getLatestCommit(token, owner, repoName);
      const storedRepo = await db.repositories.get(repo.id);
      const baseSha = storedRepo?.lastSyncCommitSha;

      const currentFileMap = new Map(currentFiles.map((f) => [f.path, f]));

      // Nothing changed remotely since the last sync: skip all content fetches.
      if (baseSha && baseSha === headSha) {
        console.log('[Pull] Remote is unchanged since last sync, nothing to pull');
        await db.repositories.update(repo.id, { lastSync: new Date().toISOString() });
        set({ isPulling: false, pullProgress: 0, pullTotal: 0 });
        return { updated: 0, conflicts };
      }

      if (baseSha) {
        // Incremental pull: only the files that changed since the last sync.
        console.log(`[Pull] Comparing ${baseSha.slice(0, 7)}...${headSha.slice(0, 7)}`);
        const changes = (
          await repositoryService.compareCommits(token, owner, repoName, baseSha, headSha)
        ).filter((c) => c.status !== 'unchanged');

        set({ pullTotal: changes.length });
        console.log(`[Pull] ${changes.length} changed file(s) in remote`);

        for (let i = 0; i < changes.length; i++) {
          const change = changes[i];
          try {
            if (change.status === 'removed') {
              const local = currentFileMap.get(change.filename);
              if (local?.isDirty) {
                // Locally edited but removed upstream: surface as a conflict.
                conflicts.push(local);
              } else if (local) {
                await db.files.delete(local.id);
                updatedCount++;
                console.log(`[Pull] Removed: ${change.filename}`);
              }
              set({ pullProgress: i + 1 });
              continue;
            }

            // A rename also removes the previous path.
            if (change.status === 'renamed' && change.previous_filename) {
              const prev = currentFileMap.get(change.previous_filename);
              if (prev?.isDirty) {
                conflicts.push(prev);
                set({ pullProgress: i + 1 });
                continue;
              }
              if (prev) {
                await db.files.delete(prev.id);
              }
            }

            const local = currentFileMap.get(change.filename);
            if (local?.isDirty && local.githubSha !== change.sha) {
              console.log(`[Pull] Conflict detected: ${change.filename}`);
              conflicts.push(local);
              set({ pullProgress: i + 1 });
              continue;
            }

            if (!local || local.githubSha !== change.sha) {
              console.log(`[Pull] Updating file: ${change.filename}`);
              await upsertFile(change.filename, local);
              updatedCount++;
            }

            set({ pullProgress: i + 1 });
          } catch (error) {
            console.error(`[Pull] Failed to pull ${change.filename}:`, error);
            // Continue with other files even if one fails
          }
        }
      } else {
        // First pull (no recorded commit): fall back to walking the full tree.
        console.log('[Pull] No previous sync commit, fetching full repository tree...');
        const tree = await repositoryService.getRepositoryTree(token, owner, repoName);
        const remoteFiles = tree.filter((item) => item.type === 'blob');

        set({ pullTotal: remoteFiles.length });
        console.log(`[Pull] Found ${remoteFiles.length} files in remote repository`);

        for (let i = 0; i < remoteFiles.length; i++) {
          const remoteFile = remoteFiles[i];
          const localFile = currentFileMap.get(remoteFile.path);

          try {
            if (!localFile || localFile.githubSha !== remoteFile.sha) {
              if (localFile?.isDirty && localFile.githubSha !== remoteFile.sha) {
                console.log(`[Pull] Conflict detected: ${remoteFile.path}`);
                conflicts.push(localFile);
                set({ pullProgress: i + 1 });
                continue;
              }

              console.log(`[Pull] Updating file: ${remoteFile.path}`);
              await upsertFile(remoteFile.path, localFile);
              updatedCount++;
            }

            set({ pullProgress: i + 1 });
          } catch (error) {
            console.error(`[Pull] Failed to pull ${remoteFile.path}:`, error);
            // Continue with other files even if one fails
          }
        }
      }

      // Record the synced commit only when fully applied; if conflicts remain,
      // keep the old base so the unresolved files are re-offered next pull.
      await db.repositories.update(repo.id, {
        lastSync: new Date().toISOString(),
        ...(conflicts.length === 0 ? { lastSyncCommitSha: headSha } : {}),
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
