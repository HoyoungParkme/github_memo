import { byId, clear, createNode, hide, show } from '../utils/dom.js';
import { bindSlashCommands } from './slash-commands.js';

const LINE_NUM_STORAGE_KEY = 'devmemo_line_numbers';

function isLineNumbersEnabled() {
  return localStorage.getItem(LINE_NUM_STORAGE_KEY) === '1';
}

function applyLineNumbers(enabled) {
  document.getElementById('app')?.classList.toggle('show-line-numbers', enabled);
  const btn = byId('line-num-btn');
  if (btn) btn.classList.toggle('active', enabled);
  if (enabled) updateLineNumbers();
}

function updateLineNumbers() {
  const ta = byId('code-editor');
  const el = byId('line-numbers');
  if (!ta || !el) return;
  const count = (ta.value.match(/\n/g) || []).length + 1;
  while (el.children.length < count) {
    const span = document.createElement('span');
    span.textContent = String(el.children.length + 1);
    el.appendChild(span);
  }
  while (el.children.length > count) el.removeChild(el.lastChild);
  el.scrollTop = ta.scrollTop;
}

export function bindLineNumberToggle() {
  const btn = byId('line-num-btn');
  if (!btn) return;
  applyLineNumbers(isLineNumbersEnabled());
  btn.addEventListener('click', () => {
    const next = !isLineNumbersEnabled();
    localStorage.setItem(LINE_NUM_STORAGE_KEY, next ? '1' : '0');
    applyLineNumbers(next);
  });
  const ta = byId('code-editor');
  if (ta) {
    ta.addEventListener('scroll', () => {
      const el = byId('line-numbers');
      if (el) el.scrollTop = ta.scrollTop;
    });
  }
}

export function syncLineNumbers() {
  if (isLineNumbersEnabled()) updateLineNumbers();
}

export function bindImagePaste(onUpload) {
  const ta = byId('code-editor');
  if (!ta) return;
  ta.addEventListener('paste', async (e) => {
    const items = [...(e.clipboardData?.items || [])];
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;
    const ext = file.type.split('/')[1]?.split(';')[0] || 'png';
    const name = `paste-${Date.now()}.${ext}`;
    const path = `assets/images/${name}`;

    const placeholder = `![업로드 중...](uploading)`;
    const start = ta.selectionStart;
    ta.setRangeText(placeholder, start, ta.selectionEnd, 'end');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      const result = await onUpload(path, base64, `이미지 업로드: ${name}`);
      const url = result?.content?.download_url || path;
      const md = `![${name}](${url})`;
      const current = ta.value;
      const idx = current.indexOf(placeholder, start);
      if (idx !== -1) {
        ta.value = current.slice(0, idx) + md + current.slice(idx + placeholder.length);
        ta.selectionStart = ta.selectionEnd = idx + md.length;
      }
    } catch (err) {
      const current = ta.value;
      const idx = current.indexOf(placeholder, start);
      if (idx !== -1) {
        ta.value = current.slice(0, idx) + current.slice(idx + placeholder.length);
        ta.selectionStart = ta.selectionEnd = idx;
      }
      throw err;
    }
    ta.dispatchEvent(new Event('input'));
  });
}

export function bindEditorControls({ onSave, onInput, onRemoveTag, onAddTag, onTabChange }) {
  byId('save-btn').addEventListener('click', onSave);
  byId('code-editor').addEventListener('input', onInput);
  byId('tag-input').addEventListener('keydown', (event) => {
    if (!['Enter', ','].includes(event.key)) return;
    event.preventDefault();
    onAddTag(byId('tag-input').value);
    byId('tag-input').value = '';
  });
  document.querySelectorAll('.editor-tab').forEach((tab) => {
    tab.addEventListener('click', () => onTabChange(tab.dataset.tab || 'edit'));
  });
  byId('meta-tags').addEventListener('click', (event) => {
    const tag = event.target.dataset.removeTag;
    if (tag) onRemoveTag(tag);
  });
}

export function bindToolbar(onInput) {
  const toolbar = byId('md-toolbar');
  if (!toolbar) return;
  toolbar.addEventListener('mousedown', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    applyFormat(btn.dataset.action);
    onInput();
  });
}

export function bindSlashCommandsToEditor(onInput) {
  const ta = byId('code-editor');
  if (ta) bindSlashCommands(ta, onInput);
}

export function renderNoteTabBar(tabs, activeTabPath, onSwitch, onClose) {
  const bar = byId('note-tab-bar');
  if (!bar) return;
  clear(bar);
  bar.style.display = tabs.length > 0 ? 'flex' : 'none';
  tabs.forEach((tab) => {
    const item = createNode('div', { className: `note-tab${tab.path === activeTabPath ? ' active' : ''}` });
    item.dataset.path = tab.path;
    const label = createNode('span', {
      className: 'note-tab-label',
      text: `${tab.isDirty ? '● ' : ''}${tab.name}`,
    });
    const closeBtn = createNode('button', { className: 'note-tab-close', text: '×' });
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); onClose(tab.path); });
    item.appendChild(label);
    item.appendChild(closeBtn);
    item.addEventListener('click', () => onSwitch(tab.path));
    bar.appendChild(item);
  });
}

export function openEditor(path, notesPath, body, tags, tab) {
  hide(byId('empty-state'));
  show(byId('editor-container'), 'flex');
  showSidebarNoteTags();
  byId('code-editor').value = body;
  renderTags(tags);
  byId('breadcrumb').textContent = path.replace(`${notesPath}/`, '');
  switchTab(tab);
}

export function showEmptyState() {
  hide(byId('editor-container'));
  show(byId('empty-state'), 'flex');
  hideSidebarNoteTags();
}

function showSidebarNoteTags() {
  const el = byId('sidebar-note-tags');
  if (el) el.style.display = '';
}

function hideSidebarNoteTags() {
  const el = byId('sidebar-note-tags');
  if (el) el.style.display = 'none';
}

export function getEditorBody() {
  return byId('code-editor').value;
}

export function renderTags(tags) {
  const container = byId('meta-tags');
  clear(container);
  tags.forEach((tag) => {
    const chip = createNode('span', { className: 'meta-tag', text: `#${tag}` });
    const remove = createNode('button', { text: '×', dataset: { removeTag: tag } });
    chip.appendChild(remove);
    container.appendChild(chip);
  });
}

export function switchTab(tab) {
  document.querySelectorAll('.editor-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  byId('editor-content').classList.toggle('split-view', tab === 'split');
  byId('editor-content').classList.toggle('preview-only', tab === 'preview');
  byId('preview-area').classList.toggle('is-active', tab !== 'edit');
}

export function setSaveState(message, busy = false) {
  byId('save-status').textContent = message;
  byId('save-btn').classList.toggle('is-busy', busy);
  byId('save-icon').textContent = busy ? '⏳' : '💾';
}

function applyFormat(action) {
  const ta = byId('code-editor');
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);

  if (action === 'hr') {
    ta.setRangeText('\n\n---\n\n', start, end, 'end');
    ta.focus();
    return;
  }

  const linePrefix = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', ul: '- ', task: '- [ ] ' };
  if (linePrefix[action]) {
    const prefix = linePrefix[action];
    const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = ta.value.indexOf('\n', end);
    const actualEnd = lineEnd === -1 ? ta.value.length : lineEnd;
    const lines = ta.value.slice(lineStart, actualEnd).split('\n');
    const newText = lines.map((l) => prefix + l).join('\n');
    ta.setRangeText(newText, lineStart, actualEnd, 'end');
    ta.focus();
    return;
  }

  const wrap = {
    bold: ['**', '**', '굵은 텍스트'],
    italic: ['*', '*', '기울임'],
    strike: ['~~', '~~', '취소선'],
    code: ['`', '`', '코드'],
    codeblock: ['```\n', '\n```', '코드 블록'],
    link: ['[', '](url)', '링크 텍스트'],
  };

  if (wrap[action]) {
    const [pre, suf, placeholder] = wrap[action];
    const text = selected || placeholder;
    ta.setRangeText(pre + text + suf, start, end, 'select');
    if (!selected) {
      ta.selectionStart = start + pre.length;
      ta.selectionEnd = start + pre.length + text.length;
    }
    ta.focus();
  }
}
