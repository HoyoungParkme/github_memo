import { byId, clear, createNode } from '../utils/dom.js';
import { showContextMenu } from './context-menu.js';

const collapsedFolders = new Set();
const FOLDER_COLORS_KEY = 'devmemo_folder_colors';

function getFolderColors() {
  try { return JSON.parse(localStorage.getItem(FOLDER_COLORS_KEY) || '{}'); } catch { return {}; }
}

function setFolderColor(path, color) {
  const colors = getFolderColors();
  if (color) colors[path] = color;
  else delete colors[path];
  localStorage.setItem(FOLDER_COLORS_KEY, JSON.stringify(colors));
  const row = document.querySelector(`.tree-item[data-path="${CSS.escape(path)}"]`);
  if (row) {
    const dot = row.querySelector('.tree-folder-dot');
    const label = row.querySelector('.tree-label');
    if (dot) dot.style.color = color || '';
    if (label) label.style.color = color || '';
  }
}

const FOLDER_COLOR_OPTIONS = [
  { color: '', title: '기본' },
  { color: '#e05555', title: '빨강' },
  { color: '#e07d35', title: '주황' },
  { color: '#d4a017', title: '노랑' },
  { color: '#4caf50', title: '초록' },
  { color: '#7c6af7', title: '보라' },
  { color: '#4a9eff', title: '파랑' },
  { color: '#e05599', title: '핑크' },
];

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
    text: emptyNotes ? 'notes 폴더가 없습니다. 새 메모를 만들면 자동으로 생성됩니다.' : message,
  }));
}

export function renderTree(tree, handlers, depth = 0, container = byId('file-tree')) {
  if (depth === 0) clear(container);
  const colors = getFolderColors();

  tree.forEach((item) => {
    const row = createNode('div', {
      className: 'tree-item',
      dataset: { path: item.path, type: item.type, depth: String(depth) },
    });

    if (item.type === 'dir') {
      const isCollapsed = collapsedFolders.has(item.path);
      const arrow = createNode('span', { className: `tree-arrow${isCollapsed ? '' : ' open'}`, text: '▶' });
      const dot = createNode('span', { className: 'tree-folder-dot', text: '■' });
      const label = createNode('span', { className: 'tree-label', text: item.name });

      const folderColor = colors[item.path];
      if (folderColor) {
        dot.style.color = folderColor;
        label.style.color = folderColor;
      }

      row.appendChild(arrow);
      row.appendChild(dot);
      row.appendChild(label);

      row.addEventListener('click', () => toggleFolder(item.path, arrow));
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, [
          { label: '이름 바꾸기', action: () => handlers.onRenameFolder?.(item) },
          { type: 'separator' },
          {
            type: 'colors',
            label: '폴더 색상',
            colors: FOLDER_COLOR_OPTIONS,
            onSelect: (color) => setFolderColor(item.path, color),
          },
        ]);
      });

      row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('drag-over');
        try {
          const file = JSON.parse(e.dataTransfer.getData('text/plain'));
          if (file.path) handlers.onMove?.(file, item.path);
        } catch { /* ignore */ }
      });

      container.appendChild(row);
      const children = createNode('div', { className: 'tree-children', dataset: { folder: item.path } });
      if (isCollapsed) children.style.display = 'none';
      container.appendChild(children);
      renderTree(item.children, handlers, depth + 1, children);
      return;
    }

    // 파일
    row.draggable = true;
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ path: item.path, name: item.name, sha: item.sha }));
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => row.classList.remove('dragging'));

    row.appendChild(createNode('span', { className: 'tree-label', text: item.name }));

    const remove = createNode('button', { className: 'tree-delete', text: '✕' });
    remove.addEventListener('click', (event) => { event.stopPropagation(); handlers.onDelete(event, item); });
    row.appendChild(remove);

    row.addEventListener('click', () => handlers.onOpen(item));
    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, [
        { label: '이름 바꾸기', action: () => handlers.onRename?.(item) },
        { label: '휴지통으로 이동', action: () => handlers.onDelete(null, item), danger: true },
      ]);
    });

    container.appendChild(row);
  });
}

export function startInlineRename(path, onConfirm) {
  const row = document.querySelector(`.tree-item[data-path="${CSS.escape(path)}"]`);
  if (!row) return;
  const label = row.querySelector('.tree-label');
  if (!label) return;

  const originalText = label.textContent;
  const input = document.createElement('input');
  input.className = 'tree-rename-input';
  input.value = originalText;
  label.replaceWith(input);
  input.focus();
  input.select();

  let done = false;

  function confirm() {
    if (done) return;
    done = true;
    const newName = input.value.trim();
    input.replaceWith(label);
    if (newName && newName !== originalText) onConfirm(newName);
  }

  function cancel() {
    if (done) return;
    done = true;
    input.replaceWith(label);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    e.stopPropagation();
  });
  input.addEventListener('blur', confirm);
}

export function setActiveTreeItem(path) {
  document.querySelectorAll('.tree-item').forEach((item) =>
    item.classList.toggle('active', item.dataset.path === path)
  );
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
  const matched = new Set(
    notes.filter((note) => !activeTag || note.tags.includes(activeTag)).map((note) => note.path)
  );
  document.querySelectorAll('.tree-item[data-type="file"]').forEach((item) => {
    item.style.display = matched.has(item.dataset.path) ? '' : 'none';
  });

  if (!activeTag) {
    document.querySelectorAll('.tree-children').forEach((folder) => {
      if (!collapsedFolders.has(folder.dataset.folder)) folder.style.display = '';
    });
    document.querySelectorAll('.tree-item[data-type="dir"]').forEach((row) => {
      row.style.display = '';
    });
    return;
  }

  [...document.querySelectorAll('.tree-children')].reverse().forEach((folder) => {
    const hasVisibleChild = [...folder.children].some((child) => child.style.display !== 'none');
    folder.style.display = hasVisibleChild ? '' : 'none';
    const row = document.querySelector(`.tree-item[data-type="dir"][data-path="${folder.dataset.folder}"]`);
    if (row) row.style.display = hasVisibleChild ? '' : 'none';
  });
}

function toggleFolder(path, arrow) {
  const node = document.querySelector(`.tree-children[data-folder="${path}"]`);
  if (!node) return;
  const willCollapse = node.style.display !== 'none';
  node.style.display = willCollapse ? 'none' : '';
  arrow.classList.toggle('open', !willCollapse);
  if (willCollapse) collapsedFolders.add(path);
  else collapsedFolders.delete(path);
}
