import { defaultConfig, getNoteCacheKey, initialPasswordHash, storageKeys } from '../config.js';

export function loadMeta() {
  const raw = localStorage.getItem(storageKeys.meta);
  if (!raw) return { notesPath: defaultConfig.notesPath, pwHash: initialPasswordHash };
  try {
    const parsed = JSON.parse(raw);
    return {
      notesPath: parsed.notesPath || defaultConfig.notesPath,
      pwHash: parsed.pwHash || initialPasswordHash,
    };
  } catch {
    return { notesPath: defaultConfig.notesPath, pwHash: initialPasswordHash };
  }
}

export function saveMeta(config) {
  localStorage.setItem(storageKeys.meta, JSON.stringify({
    notesPath: config.notesPath || defaultConfig.notesPath,
    pwHash: config.pwHash,
  }));
}

export function isAuthenticated() {
  return sessionStorage.getItem(storageKeys.auth) === 'ok';
}

export function setAuthenticated() {
  sessionStorage.setItem(storageKeys.auth, 'ok');
}

export function loadTheme() {
  return localStorage.getItem(storageKeys.theme) || 'dark';
}

export function saveTheme(theme) {
  localStorage.setItem(storageKeys.theme, theme);
}

export function clearAll() {
  localStorage.removeItem(storageKeys.meta);
  localStorage.removeItem(storageKeys.theme);
  sessionStorage.removeItem(storageKeys.auth);
}

export function loadNoteCache(config) {
  const raw = sessionStorage.getItem(getNoteCacheKey(config));
  return raw ? JSON.parse(raw) : {};
}

export function saveNoteCache(config, cache) {
  sessionStorage.setItem(getNoteCacheKey(config), JSON.stringify(cache));
}
