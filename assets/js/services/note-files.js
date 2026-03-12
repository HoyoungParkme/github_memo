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

// cachedContent 전달 시 GET 생략 (sha는 트리의 file.sha 사용)
export async function renameNote(api, file, newName, cachedContent = null) {
  const safeName = sanitizeName(newName);
  const parts = file.path.split('/');
  parts[parts.length - 1] = `${safeName}.md`;
  const newPath = parts.join('/');
  let content = cachedContent;
  if (!content) {
    const data = await api.getContent(file.path);
    content = decodeBase64(data.content);
  }
  await api.putContent(newPath, content, `이름 변경: ${file.name} → ${safeName}`);
  await api.deleteContent(file.path, `이름 변경: ${file.path}`, file.sha);
  return { path: newPath, name: safeName };
}

// cachedContent 전달 시 GET 생략
export async function moveNote(api, file, targetFolder, cachedContent = null) {
  const filename = file.path.split('/').pop();
  return moveNoteToPath(api, file, `${targetFolder}/${filename}`, cachedContent);
}

export async function moveNoteToPath(api, file, newPath, cachedContent = null) {
  if (newPath === file.path) return null;
  let content = cachedContent;
  if (!content) {
    const data = await api.getContent(file.path);
    content = decodeBase64(data.content);
  }
  await api.putContent(newPath, content, `이동: ${file.path} → ${newPath}`);
  await api.deleteContent(file.path, `이동: ${file.path}`, file.sha);
  return { path: newPath, name: file.name };
}

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
