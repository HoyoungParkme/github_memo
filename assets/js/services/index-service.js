import { decodeBase64 } from '../utils/encoding.js';
import { parseFrontmatter } from '../utils/frontmatter.js';
import { loadNoteCache, saveNoteCache } from './storage.js';
import { flattenTree } from './tree-service.js';

export async function buildNoteIndex(tree, api, config) {
  const files = flattenTree(tree, []);
  const cache = loadNoteCache(config);
  const nextCache = {};
  const notes = [];
  const pending = [];

  files.forEach((file) => {
    const cached = cache[file.path];
    if (cached?.sha === file.sha) {
      nextCache[file.path] = cached;
      notes.push(cached);
      return;
    }
    pending.push(file);
  });

  const fresh = await runInBatches(pending, 4, async (file) => {
    const data = await api.getContent(file.path);
    return toNoteRecord(file, data.sha, decodeBase64(data.content));
  });

  fresh.forEach((note) => {
    nextCache[note.path] = note;
    notes.push(note);
  });

  saveNoteCache(config, nextCache);
  return notes.sort((left, right) => left.path.localeCompare(right.path));
}

export function createFuse(notes) {
  return new window.Fuse(notes, {
    includeScore: true,
    ignoreLocation: true,
    threshold: 0.35,
    keys: ['title', 'name', 'path', 'tags', 'searchBody'],
  });
}

export function buildSnippet(note, query) {
  const text = note.searchBody || '';
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index === -1) return text.slice(0, 140);
  return text.slice(Math.max(0, index - 40), index + 100).trim();
}

function toNoteRecord(file, sha, content) {
  const { frontmatter, body } = parseFrontmatter(content);
  return {
    path: file.path,
    sha,
    name: file.name,
    title: frontmatter.title || file.name,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    body,
    searchBody: body.replace(/\s+/g, ' ').trim(),
  };
}

async function runInBatches(items, size, handler) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    const batch = items.slice(index, index + size);
    const values = await Promise.all(batch.map(handler));
    result.push(...values);
  }
  return result;
}
