import { createOctokitClient } from '../../utils/octokit';
import type { GitHubUser } from '../../types';

const TOKEN_KEY = 'github_token';

export class GitHubAuthService {
  /**
   * Login with Personal Access Token
   * @param token GitHub PAT
   * @returns User information if successful
   */
  async login(token: string): Promise<GitHubUser> {
    try {
      const octokit = createOctokitClient(token);
      const { data } = await octokit.request('GET /user');

      // Save token to LocalStorage
      this.saveToken(token);

      return {
        login: data.login,
        id: data.id,
        avatar_url: data.avatar_url,
        name: data.name,
        email: data.email,
        bio: data.bio,
      };
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Invalid token or network error');
    }
  }

  /**
   * Logout and clear stored token
   */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  /**
   * Get stored token from LocalStorage
   */
  getStoredToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    console.log('[Auth] getStoredToken:', token ? 'Found' : 'Not found');
    return token;
  }

  /**
   * Save token to LocalStorage
   */
  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    console.log('[Auth] Token saved to LocalStorage');
  }

  /**
   * Validate if stored token is still valid
   */
  async validateStoredToken(): Promise<GitHubUser | null> {
    console.log('[Auth] Validating stored token...');
    const token = this.getStoredToken();
    if (!token) {
      console.log('[Auth] No token found');
      return null;
    }

    try {
      console.log('[Auth] Attempting to validate token...');
      const user = await this.login(token);
      console.log('[Auth] Token is valid, user:', user.login);
      return user;
    } catch (error) {
      // Token is invalid, remove it
      console.error('[Auth] Token validation failed:', error);
      this.logout();
      return null;
    }
  }
}

// Export singleton instance
export const authService = new GitHubAuthService();
