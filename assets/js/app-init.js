import { appState } from './state.js';
import { sha256 } from './utils/hash.js';
import { createGitHubApi } from './services/github-api.js';
import { listFolders } from './services/tree-service.js';
import { isAuthenticated, loadMeta, setAuthenticated } from './services/storage.js';
import { initTheme } from './ui/theme.js';
import { bindLockControls, clearPasswordInput, getPasswordInput, hideLockScreen, setLockError, showLockScreen } from './ui/lock-screen.js';
import { openFileModal, openFolderModal } from './ui/modal-view.js';
import { createWorkspace } from './workspace.js';
import { byId, hide, show } from './utils/dom.js';

let workspace = null;

export async function initApp() {
  initTheme();
  bindLockControls(handleUnlock);
  bindGlobalActions();

  const meta = loadMeta();
  appState.config = { ...appState.config, ...meta };

  if (isAuthenticated()) {
    await showWorkspace();
    return;
  }
  showLockScreen();
}

async function handleUnlock() {
  const password = getPasswordInput();
  if (!password) return;
  if (await sha256(password) !== appState.config.pwHash) {
    clearPasswordInput();
    setLockError('비밀번호가 올바르지 않습니다.');
    return;
  }
  setLockError('');
  setAuthenticated();
  hideLockScreen();
  await showWorkspace();
}

async function showWorkspace() {
  hide(byId('lock-screen'));
  show(byId('app'), 'flex');
  workspace ??= createWorkspace(createGitHubApi());
  workspace.setOpeners(() => openFileModal(listFolders(appState.tree)), openFolderModal);
  await workspace.load();
}

function bindGlobalActions() {
  byId('search-btn').addEventListener('click', () => workspace?.openSearch());
  window.addEventListener('beforeunload', (event) => {
    if (!workspace?.confirmLeave()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      byId('save-btn').click();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      workspace?.openSearch();
    }
    if (event.key === 'Escape') workspace?.closeTransientUi();
  });
}
