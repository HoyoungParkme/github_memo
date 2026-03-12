import { defaultConfig } from './config.js';

export const appState = {
  config: { ...defaultConfig },
  tree: [],
  notes: [],
  currentFile: null,
  currentTags: [],
  activeTag: null,
  isDirty: false,
  tab: 'edit',
  fuse: null,
};
