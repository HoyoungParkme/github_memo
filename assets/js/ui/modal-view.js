import { byId, createNode, clear } from '../utils/dom.js';

export function bindModalControls({ onCreateFile, onCreateFolder }) {
  byId('new-file-confirm').addEventListener('click', onCreateFile);
  byId('new-folder-confirm').addEventListener('click', onCreateFolder);
  byId('new-file-name').addEventListener('input', updateFilePreview);
  byId('new-folder-name').addEventListener('input', updateFolderPreview);
  byId('new-file-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onCreateFile();
  });
  byId('new-folder-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onCreateFolder();
  });
  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModal(overlay.id);
    });
  });
}

export function openFileModal(folders) {
  clear(byId('new-file-folder'));
  byId('new-file-folder').appendChild(createOption('', '루트'));
  folders.forEach((folder) => {
    byId('new-file-folder').appendChild(createOption(folder.path, folder.path));
  });
  byId('new-file-name').value = '';
  updateFilePreview();
  byId('new-file-modal').classList.add('is-open');
  byId('new-file-name').focus();
}

export function openFolderModal() {
  byId('new-folder-name').value = '';
  updateFolderPreview();
  byId('new-folder-modal').classList.add('is-open');
  byId('new-folder-name').focus();
}

export function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => overlay.classList.remove('is-open'));
}

export function readFileForm() {
  return { name: byId('new-file-name').value.trim(), folder: byId('new-file-folder').value };
}

export function readFolderForm() {
  return { name: byId('new-folder-name').value.trim() };
}

function closeModal(id) {
  byId(id).classList.remove('is-open');
}

function createOption(value, text) {
  const option = createNode('option', { text });
  option.value = value;
  return option;
}

function updateFilePreview() {
  byId('file-path-preview').textContent = sanitizeName(byId('new-file-name').value || '파일명');
}

function updateFolderPreview() {
  byId('folder-path-preview').textContent = sanitizeName(byId('new-folder-name').value || '폴더명');
}

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
}
