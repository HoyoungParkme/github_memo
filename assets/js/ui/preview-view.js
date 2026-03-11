import { byId, clear, createNode } from '../utils/dom.js';
import { sanitizeHtml } from '../utils/sanitize.js';

let configured = false;

export function renderPreview(markdown, tags = []) {
  configureMarked();
  const preview = byId('preview-area');
  clear(preview);
  if (tags.length) preview.appendChild(createBadgeRow(tags));

  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizeHtml(window.marked.parse(markdown));
  while (wrapper.firstChild) preview.appendChild(wrapper.firstChild);

  preview.querySelectorAll('pre code').forEach((block) => {
    window.hljs.highlightElement(block);
    appendCopyButton(block);
  });
}

function configureMarked() {
  if (configured) return;
  window.marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
  configured = true;
}

function createBadgeRow(tags) {
  const row = createNode('div', { className: 'frontmatter-badge' });
  tags.forEach((tag) => row.appendChild(createNode('span', { className: 'tag-chip', text: `#${tag}` })));
  return row;
}

function appendCopyButton(block) {
  const button = createNode('button', { className: 'copy-btn', text: '복사' });
  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(block.textContent || '');
    button.textContent = '✓';
    window.setTimeout(() => {
      button.textContent = '복사';
    }, 1500);
  });
  block.parentElement.appendChild(button);
}
