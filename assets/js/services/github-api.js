import { encodeBase64 } from '../utils/encoding.js';

export function createGitHubApi(state) {
  async function request(path, options = {}) {
    const url = `https://api.github.com/repos/${state.config.owner}/${state.config.repo}/contents/${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${state.config.pat}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `GitHub API 오류: ${response.status}`);
    }
    return response.json();
  }

  return {
    listDirectory(path) {
      return request(path);
    },
    getContent(path) {
      return request(path);
    },
    putContent(path, content, message, sha = null) {
      const body = { message, content: encodeBase64(content) };
      if (sha) body.sha = sha;
      return request(path, { method: 'PUT', body: JSON.stringify(body) });
    },
    deleteContent(path, message, sha) {
      return request(path, {
        method: 'DELETE',
        body: JSON.stringify({ message, sha }),
      });
    },
  };
}
