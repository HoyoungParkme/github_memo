import { byId, clear, createNode } from '../utils/dom.js';

export function bindSearchControls({ onInput, onSelect }) {
  byId('search-input').addEventListener('input', (event) => onInput(event.target.value));
  byId('search-overlay').addEventListener('click', (event) => {
    if (event.target === byId('search-overlay')) closeSearch();
  });
  byId('search-results').addEventListener('click', (event) => {
    const item = event.target.closest('[data-note-path]');
    if (item) onSelect(item.dataset.notePath);
  });
}

export function openSearch() {
  byId('search-overlay').classList.add('is-open');
  byId('search-input').value = '';
  byId('search-input').focus();
  renderSearchResults([], '');
}

export function closeSearch() {
  byId('search-overlay').classList.remove('is-open');
}

export function renderSearchResults(results, query) {
  const container = byId('search-results');
  clear(container);
  if (!query.trim()) {
    container.appendChild(createNode('div', { className: 'search-empty', text: '검색어를 입력하세요' }));
    return;
  }
  if (!results.length) {
    container.appendChild(createNode('div', { className: 'search-empty', text: `"${query}" 결과가 없어` }));
    return;
  }
  results.forEach((result) => {
    const item = createNode('div', { className: 'search-result-item', dataset: { notePath: result.path } });
    item.appendChild(createNode('div', { className: 'search-result-title', text: `📝 ${result.title}` }));
    item.appendChild(createNode('div', { className: 'search-result-path', text: result.path }));
    item.appendChild(createNode('div', { className: 'search-result-snippet', text: result.snippet }));
    container.appendChild(item);
  });
}
