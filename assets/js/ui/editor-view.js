import { byId, clear, createNode, hide, show } from '../utils/dom.js';

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

export function openEditor(path, notesPath, body, tags, tab) {
  hide(byId('empty-state'));
  show(byId('editor-container'), 'flex');
  byId('code-editor').value = body;
  renderTags(tags);
  byId('breadcrumb').textContent = path.replace(`${notesPath}/`, '');
  switchTab(tab);
}

export function showEmptyState() {
  hide(byId('editor-container'));
  show(byId('empty-state'), 'flex');
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
  byId('preview-area').classList.toggle('is-active', tab !== 'edit');
}

export function setSaveState(message, busy = false) {
  byId('save-status').textContent = message;
  byId('save-btn').classList.toggle('is-busy', busy);
  byId('save-icon').textContent = busy ? '⏳' : '💾';
}
