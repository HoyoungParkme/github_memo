import { byId, hide, show } from '../utils/dom.js';

export function bindSetupControls(onSave) {
  byId('setup-save-btn').addEventListener('click', onSave);
}

export function showSetupScreen(config) {
  hide(byId('lock-screen'));
  hide(byId('app'));
  show(byId('setup-screen'), 'flex');
  byId('cfg-pat').value = '';
  byId('cfg-pw').value = '';
}

export function hideSetupScreen() {
  hide(byId('setup-screen'));
}

export function readSetupForm() {
  return {
    pat: byId('cfg-pat').value.trim(),
    newPassword: byId('cfg-pw').value,
  };
}
