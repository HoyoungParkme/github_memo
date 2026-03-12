import { decodeBase64 } from '../utils/encoding.js';

const TRASH_KEY = 'devmemo_trash_v1';
const TRASH_DIR = '_trash';
export const TRASH_EXPIRY_DAYS = 30;

export function getTrashItems() {
  try { return JSON.parse(localStorage.getItem(TRASH_KEY) || '[]'); } catch { return []; }
}

function saveTrash(items) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(items));
}

export async function moveToTrash(api, file) {
  const data = await api.getContent(file.path);
  const content = decodeBase64(data.content);
  const trashPath = `${TRASH_DIR}/${Date.now()}-${file.path.replace(/\//g, '_')}`;
  await api.putContent(trashPath, content, `trash: ${file.path}`);
  await api.deleteContent(file.path, `trash: ${file.path}`, data.sha);
  const items = getTrashItems();
  items.push({ trashPath, originalPath: file.path, name: file.name, deletedAt: new Date().toISOString() });
  saveTrash(items);
}

export async function permanentDelete(api, item) {
  try {
    const data = await api.getContent(item.trashPath);
    await api.deleteContent(item.trashPath, `perm-delete: ${item.originalPath}`, data.sha);
  } catch { /* already gone */ }
  saveTrash(getTrashItems().filter((i) => i.trashPath !== item.trashPath));
}

export async function restoreFromTrash(api, item) {
  const data = await api.getContent(item.trashPath);
  const content = decodeBase64(data.content);
  await api.putContent(item.originalPath, content, `restore: ${item.originalPath}`);
  await api.deleteContent(item.trashPath, `restore: ${item.trashPath}`, data.sha);
  saveTrash(getTrashItems().filter((i) => i.trashPath !== item.trashPath));
}

export async function cleanExpiredItems(api) {
  const now = Date.now();
  const expired = getTrashItems().filter(
    (item) => now - new Date(item.deletedAt).getTime() > TRASH_EXPIRY_DAYS * 86400000
  );
  for (const item of expired) await permanentDelete(api, item);
}
