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
    const lang = [...block.classList].find((c) => c.startsWith('language-'))?.replace('language-', '');
    if (lang === 'mermaid') {
      renderMermaidBlock(block);
      return;
    }
    window.hljs.highlightElement(block);
    appendCopyButton(block);
  });
}

function renderMermaidBlock(block) {
  const pre = block.parentElement;
  const code = block.textContent || '';
  const container = document.createElement('div');
  container.className = 'mermaid-block';
  pre.replaceWith(container);
  if (window.mermaid) {
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    window.mermaid.render(id, code).then(({ svg }) => {
      container.innerHTML = svg;
    }).catch((err) => {
      container.textContent = `Mermaid 오류: ${err.message}`;
      container.className = 'mermaid-block mermaid-error';
    });
  } else {
    container.textContent = code;
  }
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
