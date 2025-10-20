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
