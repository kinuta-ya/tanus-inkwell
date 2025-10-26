import { createOctokitClient } from '../../utils/octokit';
import type { GitHubUser } from '../../types';
import { encryptString, decryptString, isCryptoAvailable } from '../../utils/crypto';

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
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) {
      console.log('[Auth] getStoredToken: Not found');
      return null;
    }

    // Check if crypto is available
    if (!isCryptoAvailable()) {
      console.warn('[Auth] Web Crypto API not available, storing token in plaintext');
      return encryptedToken;
    }

    // Note: We can't use async in getStoredToken, so we'll handle this differently
    // For now, we'll check if the token is encrypted (base64) or plaintext
    try {
      // If it looks like base64, assume it's encrypted
      if (/^[A-Za-z0-9+/]+=*$/.test(encryptedToken)) {
        console.log('[Auth] getStoredToken: Found (encrypted)');
        return encryptedToken; // Return encrypted, will be decrypted when needed
      } else {
        console.log('[Auth] getStoredToken: Found (plaintext - legacy)');
        return encryptedToken;
      }
    } catch (error) {
      console.error('[Auth] Error reading token:', error);
      return null;
    }
  }

  /**
   * Get and decrypt stored token
   */
  async getDecryptedToken(): Promise<string | null> {
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) {
      return null;
    }

    if (!isCryptoAvailable()) {
      return encryptedToken; // Return as-is if crypto not available
    }

    try {
      return await decryptString(encryptedToken);
    } catch (error) {
      console.error('[Auth] Failed to decrypt token, it might be plaintext:', error);
      // Assume it's a legacy plaintext token
      return encryptedToken;
    }
  }

  /**
   * Save token to LocalStorage (encrypted)
   */
  private async saveToken(token: string): Promise<void> {
    if (!isCryptoAvailable()) {
      console.warn('[Auth] Web Crypto API not available, storing token in plaintext');
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }

    try {
      const encrypted = await encryptString(token);
      localStorage.setItem(TOKEN_KEY, encrypted);
      console.log('[Auth] Token encrypted and saved to LocalStorage');
    } catch (error) {
      console.error('[Auth] Encryption failed, falling back to plaintext:', error);
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  /**
   * Validate if stored token is still valid
   */
  async validateStoredToken(): Promise<GitHubUser | null> {
    console.log('[Auth] Validating stored token...');
    const token = await this.getDecryptedToken();
    if (!token) {
      console.log('[Auth] No token found');
      return null;
    }

    try {
      console.log('[Auth] Attempting to validate token...');
      // Don't use login() here as it will re-save the token
      // Just validate the token and return user info
      const octokit = createOctokitClient(token);
      const { data } = await octokit.request('GET /user');

      const user = {
        login: data.login,
        id: data.id,
        avatar_url: data.avatar_url,
        name: data.name,
        email: data.email,
        bio: data.bio,
      };

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
