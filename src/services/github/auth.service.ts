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
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Save token to LocalStorage
   */
  private saveToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Validate if stored token is still valid
   */
  async validateStoredToken(): Promise<GitHubUser | null> {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    try {
      return await this.login(token);
    } catch {
      // Token is invalid, remove it
      this.logout();
      return null;
    }
  }
}

// Export singleton instance
export const authService = new GitHubAuthService();
