import { appState } from './state.js';
import { sha256 } from './utils/hash.js';
import { createGitHubApi } from './services/github-api.js';
import { listFolders } from './services/tree-service.js';
import { clearAll, isAuthenticated, loadMeta, saveMeta, setAuthenticated } from './services/storage.js';
import { showToast } from './ui/toast.js';
import { initTheme } from './ui/theme.js';
import { bindLockControls, clearPasswordInput, getPasswordInput, hideLockScreen, setLockError, showLockScreen } from './ui/lock-screen.js';
import { bindSetupControls, hideSetupScreen, readSetupForm, showSetupScreen } from './ui/setup-screen.js';
import { openFileModal, openFolderModal } from './ui/modal-view.js';
import { createWorkspace } from './workspace.js';
import { byId, hide, show } from './utils/dom.js';

let workspace = null;

export async function initApp() {
  initTheme();
  bindLockControls(handleUnlock, resetApp);
  bindSetupControls(saveSetup);
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
    setLockError('비밀번호가 틀렸어요');
    return;
  }
  setLockError('');
  setAuthenticated();
  hideLockScreen();
  await showWorkspace();
}

async function saveSetup() {
  const { newPassword } = readSetupForm();
  if (!newPassword) {
    showToast('새 비밀번호를 입력해', 'error');
    return;
  }
  appState.config.pwHash = await sha256(newPassword);
  saveMeta(appState.config);
  hideSetupScreen();
  showToast('비밀번호가 변경됐어', 'success');
}

async function showWorkspace() {
  hide(byId('setup-screen'));
  hide(byId('lock-screen'));
  show(byId('app'), 'flex');
  workspace ??= createWorkspace(createGitHubApi());
  workspace.setOpeners(() => openFileModal(listFolders(appState.tree)), openFolderModal);
  await workspace.load();
}

function bindGlobalActions() {
  byId('settings-btn').addEventListener('click', () => showSetupScreen());
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

function resetApp() {
  if (!window.confirm('모든 설정을 초기화할까? GitHub 메모 데이터는 삭제되지 않아.')) return;
  clearAll();
  window.location.reload();
}
