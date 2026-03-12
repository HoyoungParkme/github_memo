import { appState } from './state.js';
import { buildFrontmatter, parseFrontmatter } from './utils/frontmatter.js';
import { decodeBase64 } from './utils/encoding.js';
import { showToast } from './ui/toast.js';
import { renderPreview } from './ui/preview-view.js';
import { updateToc } from './ui/toc-view.js';
import { bindEditorControls, bindSlashCommandsToEditor, bindToolbar, getEditorBody, openEditor, renderNoteTabBar, renderTags, setSaveState, showEmptyState, switchTab } from './ui/editor-view.js';
import { applyTagFilter, renderTagFilter, renderTree, setActiveTreeItem, showTreeError, showTreeLoading } from './ui/tree-view.js';
import { bindSearchControls, closeSearch, openSearch, renderSearchResults } from './ui/search-view.js';
import { bindModalControls, closeAllModals } from './ui/modal-view.js';
import { buildNoteIndex, buildSnippet, createFuse } from './services/index-service.js';
import { loadNoteCache, saveNoteCache } from './services/storage.js';
import { fetchTree } from './services/tree-service.js';
import { createFileActions } from './workspace-file-actions.js';
import { getTrashItems, permanentDelete, restoreFromTrash, cleanExpiredItems, TRASH_EXPIRY_DAYS } from './services/trash-service.js';
import { showContextMenu } from './ui/context-menu.js';

export function createWorkspace(api) {
  const fileActions = createFileActions(api, load, openNote);
  bindEditorControls({ onSave: saveCurrentNote, onInput: handleEditorInput, onRemoveTag: removeTag, onAddTag: addTag, onTabChange: changeTab });
  bindToolbar(handleEditorInput);
  bindSlashCommandsToEditor(handleEditorInput);
  bindSearchControls({ onInput: searchNotes, onSelect: openFromSearch });
  bindModalControls({ onCreateFile: fileActions.createNewFile, onCreateFolder: fileActions.createNewFolder });
  setupTrashPanel();
  setupSidebarToggles();
  setupTabDrop();
  cleanExpiredItems(api).catch(() => {});
  return { load, openSearch, closeTransientUi, confirmLeave, setOpeners };

  function setOpeners(openFileModal, openFolderModal) {
    document.getElementById('new-note-btn').onclick = openFileModal;
    document.getElementById('new-note-footer-btn').onclick = openFileModal;
    document.getElementById('new-note-empty-btn').onclick = openFileModal;
    document.getElementById('new-folder-btn').onclick = openFolderModal;
    // 사이드바 빈 공간 우클릭
    document.getElementById('file-tree').addEventListener('contextmenu', (e) => {
      if (e.target.closest('.tree-item')) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: '새 메모', action: openFileModal },
        { label: '새 폴더', action: openFolderModal },
      ]);
    });
  }

  async function load() {
    showTreeLoading();
    try {
      appState.tree = await fetchTree(api, appState.config.notesPath);
      renderTree(appState.tree, {
        onOpen: openNote,
        onDelete: fileActions.deleteNote,
        onRename: fileActions.renameFile,
        onRenameFolder: fileActions.renameFolder,
        onMove: fileActions.moveFile,
      });
      appState.notes = await buildNoteIndex(appState.tree, api, appState.config);
      appState.fuse = createFuse(appState.notes);
      syncTagFilter();
    } catch (error) {
      showTreeError(error.message, error.message.includes('404') || error.message.includes('Not Found'));
    }
  }

  async function openNote(file) {
    // 이미 탭에 열려 있으면 전환만
    const existing = appState.openTabs.find((t) => t.path === file.path);
    if (existing) {
      if (!confirmLeave()) return;
      saveCurrentTabState();
      switchToTab(existing.path);
      return;
    }

    if (!confirmLeave()) return;
    try {
      const data = await api.getContent(file.path);
      const decodedContent = decodeBase64(data.content);
      appState.contentCache[file.path] = decodedContent;
      const parsed = parseFrontmatter(decodedContent);
      const newTab = {
        path: file.path,
        name: file.name || file.path.split('/').pop().replace(/\.md$/, ''),
        sha: data.sha,
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        tags: Array.isArray(parsed.frontmatter.tags) ? parsed.frontmatter.tags : [],
        isDirty: false,
      };
      saveCurrentTabState();
      appState.openTabs.push(newTab);
      switchToTab(file.path);
    } catch (error) {
      showToast(`불러오기 실패: ${error.message}`, 'error');
    }
  }

  function saveCurrentTabState() {
    const tab = appState.openTabs.find((t) => t.path === appState.activeTabPath);
    if (!tab) return;
    tab.body = getEditorBody();
    tab.tags = [...appState.currentTags];
    tab.isDirty = appState.isDirty;
  }

  function switchToTab(path) {
    const tab = appState.openTabs.find((t) => t.path === path);
    if (!tab) return;
    appState.activeTabPath = path;
    appState.currentFile = { path: tab.path, sha: tab.sha, frontmatter: tab.frontmatter };
    appState.currentTags = [...tab.tags];
    appState.isDirty = tab.isDirty;
    setActiveTreeItem(path);
    openEditor(path, appState.config.notesPath, tab.body, tab.tags, appState.tab);
    renderCurrent(tab.body);
    setSaveState(tab.isDirty ? '저장되지 않은 변경사항' : '');
    refreshTabBar();
  }

  function closeTab(path) {
    const tab = appState.openTabs.find((t) => t.path === path);
    if (tab?.isDirty) {
      if (!window.confirm('저장하지 않은 변경 사항이 있습니다. 버리고 닫을까요?')) return;
    }
    const idx = appState.openTabs.findIndex((t) => t.path === path);
    appState.openTabs.splice(idx, 1);

    if (appState.activeTabPath === path) {
      if (appState.openTabs.length > 0) {
        switchToTab(appState.openTabs[Math.min(idx, appState.openTabs.length - 1)].path);
      } else {
        appState.activeTabPath = null;
        appState.currentFile = null;
        appState.isDirty = false;
        showEmptyState();
        refreshTabBar();
      }
    } else {
      refreshTabBar();
    }
  }

  function refreshTabBar() {
    renderNoteTabBar(appState.openTabs, appState.activeTabPath, switchToTab, closeTab);
  }

  async function saveCurrentNote() {
    if (!appState.currentFile) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const frontmatter = { ...appState.currentFile.frontmatter, tags: appState.currentTags, updated: stamp, created: appState.currentFile.frontmatter.created || stamp };
    const content = buildFrontmatter(frontmatter) + getEditorBody();
    setSaveState('저장 중...', true);
    try {
      const result = await api.putContent(appState.currentFile.path, content, `메모 업데이트: ${appState.currentFile.path}`, appState.currentFile.sha);
      const newSha = result.content.sha;
      appState.currentFile = { ...appState.currentFile, sha: newSha, frontmatter };
      appState.contentCache[appState.currentFile.path] = content;
      appState.isDirty = false;

      // 활성 탭 상태 갱신
      const activeTab = appState.openTabs.find((t) => t.path === appState.currentFile.path);
      if (activeTab) {
        activeTab.sha = newSha;
        activeTab.frontmatter = frontmatter;
        activeTab.body = getEditorBody();
        activeTab.tags = [...appState.currentTags];
        activeTab.isDirty = false;
      }

      // 노트 인덱스 메모리 갱신 (API 호출 없음)
      const body = getEditorBody();
      const noteIdx = appState.notes.findIndex((n) => n.path === appState.currentFile.path);
      if (noteIdx !== -1) {
        const updated = {
          ...appState.notes[noteIdx],
          sha: newSha,
          tags: appState.currentTags,
          title: frontmatter.title || appState.notes[noteIdx].title,
          body,
          searchBody: body.replace(/\s+/g, ' ').trim(),
        };
        appState.notes[noteIdx] = updated;
        const cache = loadNoteCache(appState.config);
        cache[appState.currentFile.path] = updated;
        saveNoteCache(appState.config, cache);
      }
      appState.fuse = createFuse(appState.notes);
      syncTagFilter();

      setSaveState(`${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨`);
      refreshTabBar();
      showToast('저장되었습니다', 'success');
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
    const activeTab = appState.openTabs.find((t) => t.path === appState.activeTabPath);
    if (activeTab && !activeTab.isDirty) {
      activeTab.isDirty = true;
      refreshTabBar();
    }
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
    return !(appState.isDirty && appState.currentFile) || window.confirm('저장하지 않은 변경 사항이 있습니다. 버리고 이동할까요?');
  }

  function renderCurrent(body = getEditorBody()) {
    renderPreview(body, appState.currentTags);
    updateToc(body, appState.tab);
  }

  function setupTabDrop() {
    // 에디터 영역 전체를 드롭 타깃으로 - 사이드바에서 드래그해서 탭으로 열기
    const editorArea = document.querySelector('.editor-area');
    if (!editorArea) return;
    editorArea.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'link'; });
    editorArea.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const file = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (file.path) openNote(file);
      } catch { /* ignore */ }
    });
    // 탭바 자체도 드롭 타깃
    const tabBar = document.getElementById('note-tab-bar');
    if (tabBar) {
      tabBar.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'link'; });
      tabBar.addEventListener('drop', (e) => {
        e.preventDefault();
        try {
          const file = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (file.path) openNote(file);
        } catch { /* ignore */ }
      });
    }
  }

  function setupSidebarToggles() {
    const app = document.getElementById('app');
    const sidebarBtn = document.getElementById('toggle-sidebar-btn');
    const tocBtn = document.getElementById('toggle-toc-btn');
    if (sidebarBtn) sidebarBtn.addEventListener('click', () => {
      app.classList.toggle('sidebar-hidden');
      sidebarBtn.title = app.classList.contains('sidebar-hidden') ? '사이드바 열기' : '사이드바 닫기';
    });
    if (tocBtn) tocBtn.addEventListener('click', () => {
      app.classList.toggle('toc-hidden');
      tocBtn.title = app.classList.contains('toc-hidden') ? '목차 열기' : '목차 닫기';
    });
  }

  function setupTrashPanel() {
    const btn = document.getElementById('trash-btn');
    const overlay = document.getElementById('trash-overlay');
    const closeBtn = document.getElementById('trash-close-btn');
    if (btn) btn.addEventListener('click', openTrashPanel);
    if (closeBtn) closeBtn.addEventListener('click', () => overlay?.classList.remove('is-open'));
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('is-open'); });
  }

  function openTrashPanel() {
    const overlay = document.getElementById('trash-overlay');
    const list = document.getElementById('trash-list');
    if (!overlay || !list) return;
    overlay.classList.add('is-open');
    renderTrashList(list);
  }

  function renderTrashList(list) {
    list.innerHTML = '';
    const items = getTrashItems();
    if (!items.length) {
      list.innerHTML = '<div class="trash-empty">휴지통이 비어 있습니다</div>';
      return;
    }
    items.slice().reverse().forEach((item) => {
      const row = document.createElement('div');
      row.className = 'trash-item';
      const info = document.createElement('div');
      info.className = 'trash-info';
      const name = document.createElement('span');
      name.className = 'trash-name';
      name.textContent = item.name;
      const daysLeft = TRASH_EXPIRY_DAYS - Math.floor((Date.now() - new Date(item.deletedAt).getTime()) / 86400000);
      const date = document.createElement('span');
      date.className = 'trash-date';
      date.textContent = `${new Date(item.deletedAt).toLocaleDateString('ko-KR')} 삭제 · ${daysLeft}일 후 자동 삭제`;
      info.appendChild(name);
      info.appendChild(date);
      const actions = document.createElement('div');
      actions.className = 'trash-actions';
      const restoreBtn = document.createElement('button');
      restoreBtn.className = 'trash-btn-restore';
      restoreBtn.textContent = '복원';
      restoreBtn.addEventListener('click', async () => {
        restoreBtn.disabled = true;
        restoreBtn.textContent = '복원 중...';
        try {
          await restoreFromTrash(api, item);
          await load();
          renderTrashList(list);
          showToast('복원되었습니다', 'success');
        } catch (e) {
          restoreBtn.disabled = false;
          restoreBtn.textContent = '복원';
          showToast(`복원 실패: ${e.message}`, 'error');
        }
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'trash-btn-delete';
      deleteBtn.textContent = '영구 삭제';
      deleteBtn.addEventListener('click', async () => {
        if (!window.confirm('영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
        deleteBtn.disabled = true;
        try {
          await permanentDelete(api, item);
          renderTrashList(list);
        } catch (e) {
          deleteBtn.disabled = false;
          showToast(`삭제 실패: ${e.message}`, 'error');
        }
      });
      actions.appendChild(restoreBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });
  }
}
