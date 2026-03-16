import { byId, hide, show } from '../utils/dom.js';

export function bindLockControls(onUnlock) {
  byId('unlock-btn').addEventListener('click', onUnlock);
  byId('pw-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onUnlock();
  });
}

export function showLockScreen() {
  show(byId('lock-screen'), 'flex');
  hide(byId('app'));
  byId('pw-input').focus();
}

export function hideLockScreen() {
  hide(byId('lock-screen'));
}

export function getPasswordInput() {
  return byId('pw-input').value;
}

export function clearPasswordInput() {
  byId('pw-input').value = '';
}

export function setLockError(message) {
  byId('lock-error').textContent = message;
}
