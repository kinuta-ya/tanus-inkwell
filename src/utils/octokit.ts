import { Octokit } from 'octokit';

/**
 * Create an authenticated Octokit client
 * @param token GitHub Personal Access Token
 * @returns Octokit instance
 */
export const createOctokitClient = (token: string): Octokit => {
  return new Octokit({
    auth: token,
    userAgent: 'tanus-inkwell/1.0.0',
  });
};

/**
 * Validate if a token has the required permissions
 * @param token GitHub Personal Access Token
 * @returns Promise<boolean> - true if valid
 */
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const octokit = createOctokitClient(token);
    // Test the token by fetching the authenticated user
    await octokit.request('GET /user');
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};
