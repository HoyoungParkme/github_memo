export const defaultConfig = Object.freeze({
  notesPath: 'notes',
  pwHash: '',
});

export const initialPasswordHash = 'wc:98e88fba67a35360940834467610b681d2b17a978980a869a08fd43f171b4547';

export const storageKeys = Object.freeze({
  meta: 'devmemo_meta_v3',
  theme: 'devmemo_theme_v2',
  auth: 'devmemo_auth_v3',
  noteCachePrefix: 'devmemo_note_cache_v3:',
});

export function getNoteCacheKey(config) {
  return `${storageKeys.noteCachePrefix}${config.notesPath}`;
}
