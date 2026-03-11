import { byId } from '../utils/dom.js';
import { loadTheme, saveTheme } from '../services/storage.js';

export function initTheme() {
  applyTheme(loadTheme(), false);
  byId('theme-btn').addEventListener('click', toggleTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark', true);
}

function applyTheme(theme, persist) {
  document.documentElement.setAttribute('data-theme', theme);
  byId('theme-btn').textContent = theme === 'light' ? '☀️' : '🌙';
  if (persist) saveTheme(theme);
}
