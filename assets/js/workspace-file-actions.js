import { appState } from './state.js';
import { createFolder, createNote, renameNote, moveNote, moveNoteToPath } from './services/note-files.js';
import { moveToTrash } from './services/trash-service.js';
import { showEmptyState } from './ui/editor-view.js';
import { closeAllModals, readFileForm, readFolderForm } from './ui/modal-view.js';
import { showToast } from './ui/toast.js';
import { startInlineRename } from './ui/tree-view.js';

export function createFileActions(api, reload, openNote) {
  return { createNewFile, createNewFolder, deleteNote, deleteFolder, renameFile, moveFile, renameFolder };

  async function createNewFile() {
    const { name, folder } = readFileForm();
    if (!name) return showToast('파일명을 입력해 주세요.', 'error');
    try {
      const created = await createNote(api, appState.config.notesPath, name, folder);
      closeAllModals();
      await reload();
      await openNote(created);
      showToast('새 메모가 생성되었습니다.', 'success');
    } catch (error) {
      showToast(`생성 실패: ${error.message}`, 'error');
    }
  }

  async function createNewFolder() {
    const { name } = readFolderForm();
    if (!name) return showToast('폴더명을 입력해 주세요.', 'error');
    try {
      await createFolder(api, appState.config.notesPath, name);
      closeAllModals();
      await reload();
      showToast('새 폴더가 생성되었습니다.', 'success');
    } catch (error) {
      showToast(`폴더 생성 실패: ${error.message}`, 'error');
    }
  }

  async function deleteNote(event, file) {
    event?.stopPropagation();
    if (!window.confirm(`"${file.name}"을 휴지통으로 이동할까요?`)) return;
    try {
      await moveToTrash(api, file);
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('휴지통으로 이동되었습니다.', 'success');
    } catch (error) {
      showToast(`이동 실패: ${error.message}`, 'error');
    }
  }

  function renameFile(file) {
    startInlineRename(file.path, async (newName) => {
      const cachedContent = appState.contentCache?.[file.path] ?? null;
      try {
        const updated = await renameNote(api, file, newName, cachedContent);
        if (cachedContent) {
          appState.contentCache[updated.path] = cachedContent;
          delete appState.contentCache[file.path];
        }
        if (appState.currentFile?.path === file.path) {
          appState.currentFile = { ...appState.currentFile, path: updated.path };
        }
        await reload();
        showToast('이름이 변경되었습니다.', 'success');
      } catch (error) {
        showToast(`이름 변경 실패: ${error.message}`, 'error');
      }
    });
  }

  async function moveFile(file, targetFolder) {
    const currentFolder = file.path.split('/').slice(0, -1).join('/');
    if (currentFolder === targetFolder) return;
    showToast('파일 이동 중...', 'info', 8000);
    const cachedContent = appState.contentCache?.[file.path] ?? null;
    try {
      await moveNote(api, file, targetFolder, cachedContent);
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('파일이 이동되었습니다.', 'success');
    } catch (error) {
      showToast(`이동 실패: ${error.message}`, 'error');
    }
  }

  function renameFolder(folder) {
    startInlineRename(folder.path, async (newName) => {
      const safe = (v) => v.replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎ\s_-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled';
      const parts = folder.path.split('/');
      parts[parts.length - 1] = safe(newName);
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
        showToast('폴더 이름이 변경되었습니다.', 'success');
      } catch (error) {
        showToast(`폴더 이름 변경 실패: ${error.message}`, 'error');
      }
    });
  }

  async function deleteFolder(folder) {
    if (!window.confirm(`"${folder.name}" 폴더 전체를 휴지통으로 이동할까요?\n폴더 안의 모든 파일이 이동됩니다.`)) return;
    showToast('폴더 삭제 중...', 'info', 15000);
    try {
      await deleteFolderRecursive(folder);
      if (appState.currentFile?.path.startsWith(folder.path + '/')) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('폴더가 삭제되었습니다.', 'success');
    } catch (error) {
      showToast(`삭제 실패: ${error.message}`, 'error');
    }
  }

  async function deleteFolderRecursive(folderItem) {
    for (const child of folderItem.children) {
      if (child.type === 'file') {
        await moveToTrash(api, child);
      } else if (child.type === 'dir') {
        await deleteFolderRecursive(child);
      }
    }
    // 빈 폴더의 .gitkeep 삭제
    if (folderItem.children.length === 0) {
      try {
        const data = await api.getContent(`${folderItem.path}/.gitkeep`);
        await api.deleteContent(`${folderItem.path}/.gitkeep`, `폴더 삭제: ${folderItem.path}`, data.sha);
      } catch { /* .gitkeep 없으면 무시 */ }
    }
  }

  async function renameFolderRecursive(folderItem, oldBase, newBase) {
    for (const child of folderItem.children) {
      if (child.type === 'file') {
        const newPath = newBase + child.path.slice(oldBase.length);
        const cachedContent = appState.contentCache?.[child.path] ?? null;
        await moveNoteToPath(api, child, newPath, cachedContent);
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
