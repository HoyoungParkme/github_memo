import { appState } from './state.js';
import { buildFrontmatter, parseFrontmatter } from './utils/frontmatter.js';
import { decodeBase64 } from './utils/encoding.js';
import { showToast } from './ui/toast.js';
import { renderPreview } from './ui/preview-view.js';
import { updateToc } from './ui/toc-view.js';
import { bindEditorControls, getEditorBody, openEditor, renderTags, setSaveState, switchTab } from './ui/editor-view.js';
import { applyTagFilter, renderTagFilter, renderTree, setActiveTreeItem, showTreeError, showTreeLoading } from './ui/tree-view.js';
import { bindSearchControls, closeSearch, openSearch, renderSearchResults } from './ui/search-view.js';
import { bindModalControls, closeAllModals } from './ui/modal-view.js';
import { buildNoteIndex, buildSnippet, createFuse } from './services/index-service.js';
import { fetchTree } from './services/tree-service.js';
import { createFileActions } from './workspace-file-actions.js';

export function createWorkspace(api) {
  const fileActions = createFileActions(api, load, openNote);
  bindEditorControls({ onSave: saveCurrentNote, onInput: handleEditorInput, onRemoveTag: removeTag, onAddTag: addTag, onTabChange: changeTab });
  bindSearchControls({ onInput: searchNotes, onSelect: openFromSearch });
  bindModalControls({ onCreateFile: fileActions.createNewFile, onCreateFolder: fileActions.createNewFolder });
  return { load, openSearch, closeTransientUi, confirmLeave, setOpeners };

  function setOpeners(openFileModal, openFolderModal) {
    document.getElementById('new-note-btn').onclick = openFileModal;
    document.getElementById('new-note-footer-btn').onclick = openFileModal;
    document.getElementById('new-note-empty-btn').onclick = openFileModal;
    document.getElementById('new-folder-btn').onclick = openFolderModal;
  }

  async function load() {
    showTreeLoading();
    try {
      appState.tree = await fetchTree(api, appState.config.notesPath);
      renderTree(appState.tree, { onOpen: openNote, onDelete: fileActions.deleteNote });
      appState.notes = await buildNoteIndex(appState.tree, api, appState.config);
      appState.fuse = createFuse(appState.notes);
      syncTagFilter();
    } catch (error) {
      showTreeError(error.message, error.message.includes('404') || error.message.includes('Not Found'));
    }
  }

  async function openNote(file) {
    if (!confirmLeave()) return;
    try {
      const data = await api.getContent(file.path);
      const parsed = parseFrontmatter(decodeBase64(data.content));
      appState.currentFile = { path: file.path, sha: data.sha, frontmatter: parsed.frontmatter };
      appState.currentTags = Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [];
      appState.isDirty = false;
      setActiveTreeItem(file.path);
      openEditor(file.path, appState.config.notesPath, parsed.body, appState.currentTags, appState.tab);
      renderCurrent(parsed.body);
      setSaveState('');
    } catch (error) {
      showToast(`불러오기 실패: ${error.message}`, 'error');
    }
  }

  async function saveCurrentNote() {
    if (!appState.currentFile) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const frontmatter = { ...appState.currentFile.frontmatter, tags: appState.currentTags, updated: stamp, created: appState.currentFile.frontmatter.created || stamp };
    const content = buildFrontmatter(frontmatter) + getEditorBody();
    setSaveState('저장 중...', true);
    try {
      const result = await api.putContent(appState.currentFile.path, content, `메모 업데이트: ${appState.currentFile.path}`, appState.currentFile.sha);
      appState.currentFile = { ...appState.currentFile, sha: result.content.sha, frontmatter };
      appState.isDirty = false;
      setSaveState(`${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨`);
      await load();
      showToast('저장 완료', 'success');
    } catch (error) {
      setSaveState('저장 실패');
      showToast(`저장 실패: ${error.message}`, 'error');
    } finally {
      document.getElementById('save-btn').classList.remove('is-busy');
      document.getElementById('save-icon').textContent = '💾';
    }
  }

  function handleEditorInput() {
    appState.isDirty = true;
    renderCurrent();
  }

  function addTag(value) {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || appState.currentTags.includes(tag)) return;
    appState.currentTags.push(tag);
    appState.isDirty = true;
    renderTags(appState.currentTags);
    renderCurrent();
  }

  function removeTag(tag) {
    appState.currentTags = appState.currentTags.filter((item) => item !== tag);
    appState.isDirty = true;
    renderTags(appState.currentTags);
    renderCurrent();
  }

  function changeTab(tab) {
    appState.tab = tab;
    switchTab(tab);
    renderCurrent();
  }

  function searchNotes(query) {
    const results = query.trim() && appState.fuse ? appState.fuse.search(query).slice(0, 20).map(({ item }) => ({ ...item, snippet: buildSnippet(item, query) })) : [];
    renderSearchResults(results, query);
  }

  async function openFromSearch(path) {
    closeSearch();
    const note = appState.notes.find((item) => item.path === path);
    if (note) await openNote(note);
  }

  function syncTagFilter() {
    const tags = [...new Set(appState.notes.flatMap((note) => note.tags))].sort();
    renderTagFilter(tags, appState.activeTag, toggleTag);
    applyTagFilter(appState.activeTag, appState.notes);
  }

  function toggleTag(tag) {
    appState.activeTag = appState.activeTag === tag ? null : tag;
    syncTagFilter();
  }

  function closeTransientUi() {
    closeSearch();
    closeAllModals();
  }

  function confirmLeave() {
    return !(appState.isDirty && appState.currentFile) || window.confirm('저장하지 않은 변경사항이 있어. 버릴까?');
  }

  function renderCurrent(body = getEditorBody()) {
    renderPreview(body, appState.currentTags);
    updateToc(body, appState.tab);
  }
}
