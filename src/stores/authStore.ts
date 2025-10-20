import { create } from 'zustand';
import type { AuthState } from '../types';
import { authService } from '../services/github/auth.service';

interface AuthActions {
  login: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // State
  isAuthenticated: false,
  githubToken: null,
  user: null,
  isLoading: false,
  error: null,

  // Actions
  login: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login(token);
      set({
        isAuthenticated: true,
        githubToken: token,
        user,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        githubToken: null,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
      throw error;
    }
  },

  logout: () => {
    authService.logout();
    set({
      isAuthenticated: false,
      githubToken: null,
      user: null,
      error: null,
    });
  },

  checkAuth: async () => {
    console.log('[AuthStore] checkAuth called');
    set({ isLoading: true });
    try {
      const user = await authService.validateStoredToken();
      if (user) {
        const token = authService.getStoredToken();
        console.log('[AuthStore] User authenticated:', user.login);
        set({
          isAuthenticated: true,
          githubToken: token,
          user,
          isLoading: false,
        });
      } else {
        console.log('[AuthStore] No valid user found');
        set({
          isAuthenticated: false,
          githubToken: null,
          user: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('[AuthStore] checkAuth error:', error);
      set({
        isAuthenticated: false,
        githubToken: null,
        user: null,
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
