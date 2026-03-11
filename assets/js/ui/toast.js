import { byId, createNode } from '../utils/dom.js';

export function showToast(message, type = 'info', duration = 3000) {
  const toast = createNode('div', { className: `toast ${type}`, text: message });
  byId('toast-container').appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    window.setTimeout(() => toast.remove(), 300);
  }, duration);
}
