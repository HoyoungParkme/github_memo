import { byId, hide, show } from '../utils/dom.js';

export function bindSetupControls(onSave) {
  byId('setup-save-btn').addEventListener('click', onSave);
}

export function showSetupScreen() {
  show(byId('setup-screen'), 'flex');
  byId('cfg-pw').value = '';
}

export function hideSetupScreen() {
  hide(byId('setup-screen'));
}

export function readSetupForm() {
  return {
    newPassword: byId('cfg-pw').value,
  };
}
