import { byId, clear, createNode } from '../utils/dom.js';

export function showTreeLoading() {
  const tree = byId('file-tree');
  clear(tree);
  tree.appendChild(createNode('div', { className: 'tree-loading', text: '불러오는 중...' }));
}

export function showTreeError(message, emptyNotes = false) {
  const tree = byId('file-tree');
  clear(tree);
  tree.appendChild(createNode('div', {
    className: 'tree-loading',
    text: emptyNotes ? 'notes 폴더가 없어. 새 메모를 만들면 자동으로 생성돼!' : message,
  }));
}

export function renderTree(tree, handlers, depth = 0, container = byId('file-tree')) {
  if (depth === 0) clear(container);
  tree.forEach((item) => {
    const row = createNode('div', { className: 'tree-item', dataset: { path: item.path, type: item.type, depth: String(depth) } });
    row.appendChild(createNode('span', { className: 'tree-icon', text: item.type === 'dir' ? '📁' : '📝' }));
    row.appendChild(createNode('span', { className: 'tree-label', text: item.name }));
    if (item.type === 'dir') {
      row.addEventListener('click', () => toggleFolder(item.path));
      container.appendChild(row);
      const children = createNode('div', { dataset: { folder: item.path } });
      container.appendChild(children);
      renderTree(item.children, handlers, depth + 1, children);
      return;
    }
    const remove = createNode('button', { className: 'tree-delete', text: '✕' });
    remove.addEventListener('click', (event) => handlers.onDelete(event, item));
    row.appendChild(remove);
    row.addEventListener('click', () => handlers.onOpen(item));
    container.appendChild(row);
  });
}

export function setActiveTreeItem(path) {
  document.querySelectorAll('.tree-item').forEach((item) => item.classList.toggle('active', item.dataset.path === path));
}

export function renderTagFilter(tags, activeTag, onToggle) {
  const container = byId('tag-filter');
  clear(container);
  if (!tags.length) {
    container.appendChild(createNode('span', { className: 'toc-empty', text: '태그 없음' }));
    return;
  }
  tags.forEach((tag) => {
    const chip = createNode('button', { className: `tag-chip${activeTag === tag ? ' active' : ''}`, text: `#${tag}` });
    chip.addEventListener('click', () => onToggle(tag));
    container.appendChild(chip);
  });
}

export function applyTagFilter(activeTag, notes) {
  const matched = new Set(notes.filter((note) => !activeTag || note.tags.includes(activeTag)).map((note) => note.path));
  document.querySelectorAll('.tree-item[data-type="file"]').forEach((item) => {
    item.style.display = matched.has(item.dataset.path) ? '' : 'none';
  });
  [...document.querySelectorAll('[data-folder]')].reverse().forEach((folder) => {
    const hasVisibleChild = [...folder.children].some((child) => child.style.display !== 'none');
    folder.style.display = hasVisibleChild ? '' : 'none';
    const row = document.querySelector(`.tree-item[data-type="dir"][data-path="${folder.dataset.folder}"]`);
    if (row) row.style.display = hasVisibleChild ? '' : 'none';
  });
}

function toggleFolder(path) {
  const node = document.querySelector(`[data-folder="${path}"]`);
  if (!node) return;
  node.style.display = node.style.display === 'none' ? '' : 'none';
}
