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

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
