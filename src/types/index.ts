// GitHub User type
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string | null;
  email: string | null;
  bio: string | null;
}

// Repository type
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  lastSync: string | null;
  fileCount: number;
}

// File data type
export interface FileData {
  id: string;
  repoId: string;
  path: string;
  content: string;
  lastModified: string;
  isDirty: boolean;
  githubSha: string;
  size: number;
}

// Authentication state
export interface AuthState {
  isAuthenticated: boolean;
  githubToken: string | null;
  user: GitHubUser | null;
  isLoading: boolean;
  error: string | null;
}

// Sync status
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
