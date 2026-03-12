export async function fetchTree(api, path) {
  let items = [];
  try {
    items = await api.listDirectory(path);
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('Not Found')) return [];
    throw error;
  }

  // 모든 항목을 병렬 처리 (순차 → 병렬로 성능 개선)
  const result = await Promise.all(
    items.map(async (item) => {
      if (item.type === 'dir') {
        return {
          type: 'dir',
          name: item.name,
          path: item.path,
          children: await fetchTree(api, item.path),
        };
      }
      if (item.name.endsWith('.md')) {
        return {
          type: 'file',
          name: item.name.replace(/\.md$/, ''),
          path: item.path,
          sha: item.sha,
        };
      }
      return null;
    })
  );

  return result.filter(Boolean);
}

export function flattenTree(tree, result = []) {
  tree.forEach((item) => {
    if (item.type === 'file') result.push(item);
    if (item.children) flattenTree(item.children, result);
  });
  return result;
}

export function listFolders(tree, result = []) {
  tree.forEach((item) => {
    if (item.type !== 'dir') return;
    result.push(item);
    listFolders(item.children, result);
  });
  return result;
}
