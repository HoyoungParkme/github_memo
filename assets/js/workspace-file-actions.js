import { appState } from './state.js';
import { createFolder, createNote, renameNote, moveNote, moveNoteToPath } from './services/note-files.js';
import { moveToTrash } from './services/trash-service.js';
import { showEmptyState } from './ui/editor-view.js';
import { closeAllModals, readFileForm, readFolderForm } from './ui/modal-view.js';
import { showToast } from './ui/toast.js';

export function createFileActions(api, reload, openNote) {
  return { createNewFile, createNewFolder, deleteNote, renameFile, moveFile, renameFolder };

  async function createNewFile() {
    const { name, folder } = readFileForm();
    if (!name) return showToast('파일명을 입력해', 'error');
    try {
      const created = await createNote(api, appState.config.notesPath, name, folder);
      closeAllModals();
      await reload();
      await openNote(created);
      showToast('새 메모 생성 완료', 'success');
    } catch (error) {
      showToast(`생성 실패: ${error.message}`, 'error');
    }
  }

  async function createNewFolder() {
    const { name } = readFolderForm();
    if (!name) return showToast('폴더명을 입력해', 'error');
    try {
      await createFolder(api, appState.config.notesPath, name);
      closeAllModals();
      await reload();
      showToast('새 폴더 생성 완료', 'success');
    } catch (error) {
      showToast(`폴더 생성 실패: ${error.message}`, 'error');
    }
  }

  async function deleteNote(event, file) {
    event?.stopPropagation();
    if (!window.confirm(`"${file.name}"을 휴지통으로 이동할까?`)) return;
    try {
      await moveToTrash(api, file);
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('휴지통으로 이동했어', 'success');
    } catch (error) {
      showToast(`이동 실패: ${error.message}`, 'error');
    }
  }

  async function renameFile(file) {
    const newName = window.prompt('새 이름을 입력해 (확장자 제외):', file.name);
    if (!newName || newName.trim() === file.name) return;
    try {
      const updated = await renameNote(api, file, newName.trim());
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = { ...appState.currentFile, path: updated.path };
      }
      await reload();
      showToast('이름이 변경됐어', 'success');
    } catch (error) {
      showToast(`이름 변경 실패: ${error.message}`, 'error');
    }
  }

  async function moveFile(file, targetFolder) {
    const currentFolder = file.path.split('/').slice(0, -1).join('/');
    if (currentFolder === targetFolder) return;
    showToast('파일 이동 중...', 'info', 8000);
    try {
      await moveNote(api, file, targetFolder);
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('파일이 이동됐어', 'success');
    } catch (error) {
      showToast(`이동 실패: ${error.message}`, 'error');
    }
  }

  async function renameFolder(folder) {
    const newName = window.prompt('새 폴더 이름을 입력해:', folder.name);
    if (!newName || newName.trim() === folder.name) return;
    const safe = (v) => v.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
    const parts = folder.path.split('/');
    parts[parts.length - 1] = safe(newName.trim());
    const newFolderPath = parts.join('/');
    if (newFolderPath === folder.path) return;
    showToast('폴더 이름 변경 중...', 'info', 15000);
    try {
      await renameFolderRecursive(folder, folder.path, newFolderPath);
      if (appState.currentFile?.path.startsWith(folder.path + '/')) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('폴더 이름이 변경됐어', 'success');
    } catch (error) {
      showToast(`폴더 이름 변경 실패: ${error.message}`, 'error');
    }
  }

  async function renameFolderRecursive(folderItem, oldBase, newBase) {
    for (const child of folderItem.children) {
      if (child.type === 'file') {
        const newPath = newBase + child.path.slice(oldBase.length);
        await moveNoteToPath(api, child, newPath);
      } else if (child.type === 'dir') {
        await renameFolderRecursive(child, child.path, newBase + child.path.slice(oldBase.length));
      }
    }
    if (folderItem.children.length === 0) {
      try {
        const data = await api.getContent(`${oldBase}/.gitkeep`);
        await api.putContent(`${newBase}/.gitkeep`, '', `이름 변경: ${oldBase}`);
        await api.deleteContent(`${oldBase}/.gitkeep`, `이름 변경`, data.sha);
      } catch { /* .gitkeep 없으면 무시 */ }
    }
  }
}
