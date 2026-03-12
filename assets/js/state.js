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
  contentCache: {}, // path → 디코딩된 파일 내용 캐시 (GET 생략용)
  openTabs: [],        // [{ path, name, sha, frontmatter, body, tags, isDirty }]
  activeTabPath: null, // 현재 활성 탭 경로
};
