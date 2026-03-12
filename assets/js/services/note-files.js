import { decodeBase64 } from '../utils/encoding.js';

export async function createNote(api, notesPath, name, folder) {
  const safeName = sanitizeName(name);
  const path = `${folder || notesPath}/${safeName}.md`;
  const content = `---\ntitle: "${name}"\ntags: []\ncreated: "${today()}"\nupdated: "${today()}"\n---\n\n# ${name}\n`;
  await api.putContent(path, content, `메모 생성: ${name}`);
  return { path, name: safeName, sha: '' };
}

export async function createFolder(api, notesPath, name) {
  await api.putContent(`${notesPath}/${sanitizeName(name)}/.gitkeep`, '', `폴더 생성: ${name}`);
}

export async function deleteNoteFile(api, file) {
  await api.deleteContent(file.path, `메모 삭제: ${file.name}`, file.sha);
}

export async function renameNote(api, file, newName) {
  const data = await api.getContent(file.path);
  const content = decodeBase64(data.content);
  const parts = file.path.split('/');
  const safeName = sanitizeName(newName);
  parts[parts.length - 1] = `${safeName}.md`;
  const newPath = parts.join('/');
  await api.putContent(newPath, content, `이름 변경: ${file.name} → ${safeName}`);
  await api.deleteContent(file.path, `이름 변경: ${file.path}`, data.sha);
  return { path: newPath, name: safeName };
}

export async function moveNote(api, file, targetFolder) {
  const data = await api.getContent(file.path);
  const content = decodeBase64(data.content);
  const filename = file.path.split('/').pop();
  const newPath = `${targetFolder}/${filename}`;
  if (newPath === file.path) return null;
  await api.putContent(newPath, content, `이동: ${file.path} → ${newPath}`);
  await api.deleteContent(file.path, `이동: ${file.path}`, data.sha);
  return { path: newPath, name: file.name };
}

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
