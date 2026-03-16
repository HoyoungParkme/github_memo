import { encodeBase64 } from '../utils/encoding.js';

export function createGitHubApi() {
  async function request(path, options = {}) {
    const params = new URLSearchParams({ path });
    const url = `/.netlify/functions/github?${params}`;
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(options.body ? { body: options.body } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API 오류: ${response.status}`);
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
    putBinaryContent(path, base64, message) {
      return request(path, { method: 'PUT', body: JSON.stringify({ message, content: base64 }) });
    },
  };
}
