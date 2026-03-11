export const defaultConfig = Object.freeze({
  owner: '',
  repo: '',
  pat: '',
  pwHash: '',
  notesPath: 'notes',
});

export const storageKeys = Object.freeze({
  meta: 'devmemo_meta_v2',
  secret: 'devmemo_secret_v2',
  theme: 'devmemo_theme_v2',
  auth: 'devmemo_auth_v2',
  sessionConfig: 'devmemo_session_config_v2',
  noteCachePrefix: 'devmemo_note_cache_v2:',
});

export function getNoteCacheKey(config) {
  return `${storageKeys.noteCachePrefix}${config.owner}/${config.repo}`;
}
