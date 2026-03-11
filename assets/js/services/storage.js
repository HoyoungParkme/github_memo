import { defaultConfig, getNoteCacheKey, initialPasswordHash, storageKeys } from '../config.js';
import { encryptJson, decryptJson } from './crypto-config.js';

export async function loadMeta() {
  const fallbackHash = initialPasswordHash;
  const raw = localStorage.getItem(storageKeys.meta);
  if (!raw) return { notesPath: defaultConfig.notesPath, pwHash: fallbackHash };
  try {
    const parsed = JSON.parse(raw);
    return {
      notesPath: parsed.notesPath || defaultConfig.notesPath,
      pwHash: parsed.pwHash || fallbackHash,
    };
  } catch {
    return { notesPath: defaultConfig.notesPath, pwHash: fallbackHash };
  }
}

export function loadSessionConfig() {
  const raw = sessionStorage.getItem(storageKeys.sessionConfig);
  if (!raw) return { ...defaultConfig };
  try {
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return { ...defaultConfig };
  }
}

export function isAuthenticated() {
  return sessionStorage.getItem(storageKeys.auth) === 'ok';
}

export function setSessionState(config) {
  sessionStorage.setItem(storageKeys.auth, 'ok');
  sessionStorage.setItem(storageKeys.sessionConfig, JSON.stringify(config));
}

export function loadTheme() {
  return localStorage.getItem(storageKeys.theme) || 'dark';
}

export async function loadSecureConfig(password) {
  const raw = localStorage.getItem(storageKeys.secret);
  if (!raw) return { ...defaultConfig };
  const decrypted = await decryptJson(JSON.parse(raw), password);
  return { ...defaultConfig, ...decrypted };
}

export async function saveSecureConfig(config, password) {
  const secret = await encryptJson({
    owner: config.owner,
    repo: config.repo,
    pat: config.pat,
    notesPath: config.notesPath,
  }, password);
  localStorage.setItem(storageKeys.secret, JSON.stringify(secret));
  localStorage.setItem(storageKeys.meta, JSON.stringify({
    pwHash: config.pwHash || initialPasswordHash,
    notesPath: config.notesPath || defaultConfig.notesPath,
  }));
  setSessionState(config);
}

export function saveTheme(theme) {
  localStorage.setItem(storageKeys.theme, theme);
}

export function clearAll(config = null) {
  localStorage.removeItem(storageKeys.meta);
  localStorage.removeItem(storageKeys.secret);
  localStorage.removeItem(storageKeys.theme);
  sessionStorage.removeItem(storageKeys.auth);
  sessionStorage.removeItem(storageKeys.sessionConfig);
  if (config?.owner && config?.repo) {
    sessionStorage.removeItem(getNoteCacheKey(config));
  }
}

export function loadNoteCache(config) {
  const raw = sessionStorage.getItem(getNoteCacheKey(config));
  return raw ? JSON.parse(raw) : {};
}

export function saveNoteCache(config, cache) {
  sessionStorage.setItem(getNoteCacheKey(config), JSON.stringify(cache));
}
