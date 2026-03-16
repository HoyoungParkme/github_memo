export const defaultConfig = Object.freeze({
  notesPath: 'note',
  pwHash: '',
});

export const initialPasswordHash = 'wc:86cb35a822329fe1de40eb82a1791be1f66f8bd327446686bdd859a89e436853';

export const storageKeys = Object.freeze({
  meta: 'devmemo_meta_v3',
  theme: 'devmemo_theme_v2',
  auth: 'devmemo_auth_v3',
  noteCachePrefix: 'devmemo_note_cache_v3:',
});

export function getNoteCacheKey(config) {
  return `${storageKeys.noteCachePrefix}${config.notesPath}`;
}
