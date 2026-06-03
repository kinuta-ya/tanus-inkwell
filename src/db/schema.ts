import Dexie, { type Table } from 'dexie';
import type { Repository, FileData } from '../types';

export interface StoredRepository extends Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  lastSync: string | null;
  fileCount: number;
  lastSyncCommitSha?: string;
}

export interface StoredFile extends FileData {
  id: string;
  repoId: string;
  path: string;
  content: string;
  lastModified: string;
  isDirty: boolean;
  githubSha: string;
  size: number;
}

export interface AppSettings {
  id: string;
  currentRepoId: string | null;
  currentFilePath: string | null;
  theme: 'light' | 'dark';
}

export class TanusInkwellDB extends Dexie {
  repositories!: Table<StoredRepository, string>;
  files!: Table<StoredFile, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('TanusInkwellDB');

    this.version(1).stores({
      repositories: 'id, fullName, lastSync',
      files: 'id, repoId, path, isDirty, lastModified',
      settings: 'id',
    });
  }
}

export const db = new TanusInkwellDB();

// Fixed id for the single app-wide settings record
export const APP_SETTINGS_ID = 'app';

export async function getAppSettings(): Promise<AppSettings | undefined> {
  return db.settings.get(APP_SETTINGS_ID);
}

/**
 * Persist the file currently open in the editor so it can be restored on reload
 * or when navigating back to the editor. Pass null for filePath to clear it.
 */
export async function setCurrentFilePath(
  repoId: string,
  filePath: string | null
): Promise<void> {
  const existing = await db.settings.get(APP_SETTINGS_ID);
  await db.settings.put({
    id: APP_SETTINGS_ID,
    theme: existing?.theme ?? 'light',
    currentRepoId: repoId,
    currentFilePath: filePath,
  });
}
