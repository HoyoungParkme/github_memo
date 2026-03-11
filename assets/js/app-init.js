import { appState } from './state.js';
import { sha256 } from './utils/hash.js';
import { createGitHubApi } from './services/github-api.js';
import { listFolders } from './services/tree-service.js';
import { clearAll, isAuthenticated, loadMeta, loadSecureConfig, loadSessionConfig, saveSecureConfig, setSessionState } from './services/storage.js';
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
  const meta = await loadMeta();
  appState.config.notesPath = meta.notesPath;
  appState.config.pwHash = meta.pwHash;

  if (isAuthenticated()) {
    const sessionConfig = loadSessionConfig();
    if (sessionConfig.pat) {
      appState.config = { ...appState.config, ...sessionConfig };
      await showWorkspace();
      return;
    }
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
  appState.currentPassword = password;
  setLockError('');
  try {
    appState.config = { ...appState.config, ...await loadSecureConfig(password) };
  } catch {
    appState.config = { ...appState.config };
  }
  setSessionState(appState.config);
  hideLockScreen();
  if (!appState.config.owner || !appState.config.repo || !appState.config.pat) {
    showSetupScreen(appState.config);
    return;
  }
  await showWorkspace();
}

async function saveSetup() {
  const { owner, repo, pat, newPassword } = readSetupForm();
  if (!owner || !repo || (!pat && !appState.config.pat)) {
    showToast('Username, 레포, PAT은 필수야', 'error');
    return;
  }
  const password = newPassword || appState.currentPassword || 'devmemo';
  appState.currentPassword = password;
  appState.config = { ...appState.config, owner, repo, pat: pat || appState.config.pat, pwHash: await sha256(password) };
  await saveSecureConfig(appState.config, password);
  hideSetupScreen();
  await showWorkspace();
}

async function showWorkspace() {
  hide(byId('setup-screen'));
  hide(byId('lock-screen'));
  show(byId('app'), 'flex');
  workspace ??= createWorkspace(createGitHubApi(appState));
  workspace.setOpeners(() => openFileModal(listFolders(appState.tree)), openFolderModal);
  await workspace.load();
}

function bindGlobalActions() {
  byId('settings-btn').addEventListener('click', () => showSetupScreen(appState.config));
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
  clearAll(appState.config);
  window.location.reload();
}
