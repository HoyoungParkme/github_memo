const COMMANDS = [
  { id: 'h1',        icon: 'H1',   label: '제목 1',      aliases: ['h1', '제목1', '제목'] },
  { id: 'h2',        icon: 'H2',   label: '제목 2',      aliases: ['h2', '제목2'] },
  { id: 'h3',        icon: 'H3',   label: '제목 3',      aliases: ['h3', '제목3'] },
  { id: 'bold',      icon: 'B',    label: '굵게',        aliases: ['bold', '굵게', 'b'] },
  { id: 'italic',    icon: 'I',    label: '기울임',      aliases: ['italic', '기울임', 'i'] },
  { id: 'strike',    icon: 'S',    label: '취소선',      aliases: ['strike', '취소선', 's'] },
  { id: 'code',      icon: '`c`',  label: '인라인 코드', aliases: ['code', '코드', 'c'] },
  { id: 'codeblock', icon: '```',  label: '코드 블록',   aliases: ['codeblock', '코드블럭', '코드블록', 'cb'] },
  { id: 'quote',     icon: '>',    label: '인용',        aliases: ['quote', '인용', 'q'] },
  { id: 'ul',        icon: '•—',   label: '목록',        aliases: ['ul', 'list', '목록'] },
  { id: 'task',      icon: '☐',    label: '할 일',       aliases: ['task', 'todo', '할일', 't'] },
  { id: 'hr',        icon: '—',    label: '구분선',      aliases: ['hr', '구분선', '---'] },
  { id: 'link',      icon: '🔗',   label: '링크',        aliases: ['link', '링크', 'l'] },
];

let popup = null;
let activeIdx = 0;
let slashPos = -1;
let filteredCommands = [];
let onInputCallback = null;

export function bindSlashCommands(ta, onInput) {
  onInputCallback = onInput;
  ta.addEventListener('input', () => handleInput(ta));
  ta.addEventListener('keydown', (e) => handleKeydown(e, ta));
  ta.addEventListener('click', hidePopup);
  ta.addEventListener('blur', () => setTimeout(hidePopup, 150));
}

function handleInput(ta) {
  const pos = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineText = text.slice(lineStart, pos);

  // /커맨드가 행 시작에 있어야 함 (앞에 공백만 허용)
  const match = lineText.match(/^(\s*)\/(\S*)$/);
  if (match) {
    slashPos = lineStart + match[1].length;
    const query = match[2].toLowerCase();
    filteredCommands = COMMANDS.filter(
      (cmd) => query === '' || cmd.aliases.some((a) => a.toLowerCase().startsWith(query))
    );
    if (filteredCommands.length > 0) {
      activeIdx = 0;
      showPopup(ta, filteredCommands);
      return;
    }
  }
  hidePopup();
}

function handleKeydown(e, ta) {
  if (!popup) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); }
  else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectActive(ta); }
  else if (e.key === 'Escape') { e.preventDefault(); hidePopup(); }
}

function moveSelection(delta) {
  const items = popup.querySelectorAll('.slash-item');
  items[activeIdx]?.classList.remove('active');
  activeIdx = (activeIdx + delta + items.length) % items.length;
  items[activeIdx]?.classList.add('active');
  items[activeIdx]?.scrollIntoView({ block: 'nearest' });
}

function selectActive(ta) {
  const id = filteredCommands[activeIdx]?.id;
  if (id) applyCommand(ta, id);
}

export function applySlashCommand(ta, id) {
  applyCommand(ta, id);
}

function applyCommand(ta, id) {
  hidePopup();
  const pos = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', slashPos - 1) + 1;
  const before = text.slice(0, lineStart);
  const after = text.slice(pos);

  const linePrefix = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', ul: '- ', task: '- [ ] ' };
  const wrapMap = {
    bold:      ['**', '**', '굵은 텍스트'],
    italic:    ['*', '*', '기울임'],
    strike:    ['~~', '~~', '취소선'],
    code:      ['`', '`', '코드'],
    codeblock: ['```\n', '\n```', '코드 블록'],
    link:      ['[', '](url)', '링크 텍스트'],
  };

  if (linePrefix[id]) {
    ta.value = before + linePrefix[id] + after;
    ta.selectionStart = ta.selectionEnd = before.length + linePrefix[id].length;
  } else if (id === 'hr') {
    ta.value = before + '---\n' + after;
    ta.selectionStart = ta.selectionEnd = before.length + 4;
  } else if (wrapMap[id]) {
    const [pre, suf, placeholder] = wrapMap[id];
    ta.value = before + pre + placeholder + suf + after;
    ta.selectionStart = before.length + pre.length;
    ta.selectionEnd = before.length + pre.length + placeholder.length;
  }

  ta.focus();
  onInputCallback?.();
}

function showPopup(ta, commands) {
  hidePopup();
  popup = document.createElement('div');
  popup.className = 'slash-popup';

  commands.forEach((cmd, i) => {
    const item = document.createElement('div');
    item.className = `slash-item${i === 0 ? ' active' : ''}`;
    item.dataset.id = cmd.id;
    const icon = document.createElement('span');
    icon.className = 'slash-item-icon';
    icon.textContent = cmd.icon;
    const label = document.createElement('span');
    label.className = 'slash-item-label';
    label.textContent = cmd.label;
    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener('mousedown', (e) => { e.preventDefault(); applyCommand(ta, cmd.id); });
    popup.appendChild(item);
  });

  const coords = getCaretCoords(ta);
  popup.style.left = `${coords.left}px`;
  popup.style.top = `${coords.top}px`;
  document.body.appendChild(popup);
}

function hidePopup() {
  popup?.remove();
  popup = null;
  slashPos = -1;
  filteredCommands = [];
}

function getCaretCoords(ta) {
  const { selectionStart } = ta;
  const textBefore = ta.value.slice(0, selectionStart);
  const linesBefore = textBefore.split('\n');
  const rect = ta.getBoundingClientRect();
  const style = window.getComputedStyle(ta);
  const lineHeight = parseFloat(style.lineHeight) || 24;
  const paddingTop = parseFloat(style.paddingTop) || 28;
  const paddingLeft = parseFloat(style.paddingLeft) || 32;

  const approxTop = rect.top + paddingTop + (linesBefore.length - 1) * lineHeight - ta.scrollTop + lineHeight + 4;
  const approxLeft = rect.left + paddingLeft;

  return {
    left: Math.min(approxLeft, window.innerWidth - 220),
    top: Math.min(approxTop, window.innerHeight - 240),
  };
}
