import { appState } from './state.js';
import { createFolder, createNote, deleteNoteFile } from './services/note-files.js';
import { showEmptyState } from './ui/editor-view.js';
import { closeAllModals, readFileForm, readFolderForm } from './ui/modal-view.js';
import { showToast } from './ui/toast.js';

export function createFileActions(api, reload, openNote) {
  return { createNewFile, createNewFolder, deleteNote };

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
    event.stopPropagation();
    if (!window.confirm(`"${file.name}"을 삭제할까? 되돌릴 수 없어.`)) return;
    try {
      await deleteNoteFile(api, file);
      if (appState.currentFile?.path === file.path) {
        appState.currentFile = null;
        showEmptyState();
      }
      await reload();
      showToast('삭제 완료', 'success');
    } catch (error) {
      showToast(`삭제 실패: ${error.message}`, 'error');
    }
  }
}
