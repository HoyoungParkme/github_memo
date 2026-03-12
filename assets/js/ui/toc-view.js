import { byId, clear, createNode } from '../utils/dom.js';

export function clearToc() {
  const toc = byId('toc-list');
  clear(toc);
  toc.appendChild(createNode('div', { className: 'toc-empty', text: '메모를 열면 목차가 표시됩니다' }));
}

export function updateToc(markdown, tab) {
  const toc = byId('toc-list');
  const headings = markdown.split('\n')
    .map((line) => line.match(/^(#{1,3})\s+(.+)/))
    .filter(Boolean)
    .map((match) => ({ level: match[1].length, text: match[2].trim() }));

  clear(toc);
  if (!headings.length) {
    toc.appendChild(createNode('div', { className: 'toc-empty', text: 'H1~H3 제목을 추가하면 목차가 나타나요' }));
    return;
  }

  headings.forEach((heading) => {
    const item = createNode('button', { className: 'toc-item', text: heading.text });
    item.dataset.level = String(heading.level);
    item.addEventListener('click', () => scrollToHeading(heading.text, tab));
    toc.appendChild(item);
  });
}

function scrollToHeading(text, tab) {
  if (tab === 'edit') {
    const editor = byId('code-editor');
    const index = editor.value.indexOf(text);
    if (index >= 0) editor.setSelectionRange(index, index + text.length);
    editor.focus();
    return;
  }
  Array.from(byId('preview-area').querySelectorAll('h1,h2,h3')).find((heading) => {
    if (heading.textContent?.trim() !== text) return false;
    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  });
}
