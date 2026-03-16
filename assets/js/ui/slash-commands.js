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

const CODE_LANGUAGES = [
  { id: '',           icon: 'TXT', label: '없음 (plain)' },
  { id: 'javascript', icon: 'JS',  label: 'JavaScript' },
  { id: 'typescript', icon: 'TS',  label: 'TypeScript' },
  { id: 'python',     icon: 'PY',  label: 'Python' },
  { id: 'java',       icon: 'JAV', label: 'Java' },
  { id: 'kotlin',     icon: 'KT',  label: 'Kotlin' },
  { id: 'go',         icon: 'GO',  label: 'Go' },
  { id: 'rust',       icon: 'RS',  label: 'Rust' },
  { id: 'c',          icon: 'C',   label: 'C' },
  { id: 'cpp',        icon: 'C++', label: 'C++' },
  { id: 'csharp',     icon: 'C#',  label: 'C#' },
  { id: 'sql',        icon: 'SQL', label: 'SQL' },
  { id: 'bash',       icon: 'SH',  label: 'Bash / Shell' },
  { id: 'html',       icon: 'HTM', label: 'HTML' },
  { id: 'css',        icon: 'CSS', label: 'CSS' },
  { id: 'json',       icon: 'JSN', label: 'JSON' },
  { id: 'yaml',       icon: 'YML', label: 'YAML' },
  { id: 'markdown',   icon: 'MD',  label: 'Markdown' },
  { id: 'mermaid',    icon: 'MRM', label: 'Mermaid' },
];

let popup = null;
let activeIdx = 0;
let slashPos = -1;
let filteredCommands = [];
let boundTa = null;
let onInputCallback = null;
let docDownHandler = null;

export function bindSlashCommands(ta, onInput) {
  onInputCallback = onInput;
  boundTa = ta;
  ta.addEventListener('input', () => handleInput(ta));
  ta.addEventListener('compositionend', () => setTimeout(() => handleInput(ta), 0));
  ta.addEventListener('keydown', (e) => {
    if (!popup) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); moveSelection(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); moveSelection(-1); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && !e.isComposing) { e.preventDefault(); e.stopPropagation(); selectActive(ta); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hidePopup(); }
  });
}

function handleInput(ta) {
  const pos = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  const lineText = text.slice(lineStart, pos);

  const match = lineText.match(/^(\s*)\/(\S*)$/);
  if (match) {
    const newSlashPos = lineStart + match[1].length;
    const query = match[2].toLowerCase();
    const matched = COMMANDS.filter(
      (cmd) => query === '' || cmd.aliases.some((a) => a.toLowerCase().startsWith(query))
    );
    if (matched.length > 0) {
      activeIdx = 0;
      showPopup(ta, matched);
      // showPopup → hidePopup 순서로 slashPos/filteredCommands가 초기화되므로 반드시 showPopup 이후에 복원
      slashPos = newSlashPos;
      filteredCommands = matched;
      return;
    }
  }
  hidePopup();
}

function moveSelection(delta) {
  const items = popup?.querySelectorAll('.slash-item');
  if (!items) return;
  items[activeIdx]?.classList.remove('active');
  activeIdx = (activeIdx + delta + items.length) % items.length;
  items[activeIdx]?.classList.add('active');
  items[activeIdx]?.scrollIntoView({ block: 'nearest' });
}

function selectActive(ta) {
  const cmd = filteredCommands[activeIdx];
  if (!cmd) return;
  if (cmd.id === 'codeblock') {
    const savedSlashPos = slashPos;
    hidePopup();
    showCodeBlockPicker(ta, (lang) => applyCodeblockAtSlashPos(ta, savedSlashPos, lang));
  } else {
    applyCommand(ta, cmd.id);
  }
}

function applyCommand(ta, id) {
  if (slashPos === -1) return;
  const savedSlashPos = slashPos;
  hidePopup();

  const pos = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', savedSlashPos - 1) + 1;
  const before = text.slice(0, lineStart);
  const after = text.slice(pos);

  const linePrefix = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', ul: '- ', task: '- [ ] ' };
  const wrapMap = {
    bold:   ['**', '**', '굵은 텍스트'],
    italic: ['*', '*', '기울임'],
    strike: ['~~', '~~', '취소선'],
    code:   ['`', '`', '코드'],
    link:   ['[', '](url)', '링크 텍스트'],
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

function applyCodeblockAtSlashPos(ta, savedSlashPos, lang) {
  const pos = ta.selectionStart;
  const text = ta.value;
  const lineStart = text.lastIndexOf('\n', savedSlashPos - 1) + 1;
  const before = text.slice(0, lineStart);
  const after = text.slice(pos);
  const fence = lang ? `\`\`\`${lang}\n` : '```\n';
  const placeholder = '코드 블록';
  ta.value = before + fence + placeholder + '\n```' + after;
  ta.selectionStart = before.length + fence.length;
  ta.selectionEnd = before.length + fence.length + placeholder.length;
  ta.focus();
  onInputCallback?.();
}

export function showCodeBlockPicker(ta, onSelect) {
  let pickerPopup = null;
  let pickerIdx = 0;
  let pickerDocHandler = null;
  let keyHandler = null;

  const close = () => {
    pickerPopup?.remove();
    pickerPopup = null;
    if (pickerDocHandler) document.removeEventListener('pointerdown', pickerDocHandler);
    if (keyHandler) ta.removeEventListener('keydown', keyHandler);
    pickerDocHandler = null;
    keyHandler = null;
  };

  pickerPopup = document.createElement('div');
  pickerPopup.className = 'slash-popup lang-picker';

  const movePickerSel = (delta) => {
    const items = pickerPopup?.querySelectorAll('.slash-item');
    if (!items) return;
    items[pickerIdx]?.classList.remove('active');
    pickerIdx = (pickerIdx + delta + items.length) % items.length;
    items[pickerIdx]?.classList.add('active');
    items[pickerIdx]?.scrollIntoView({ block: 'nearest' });
  };

  CODE_LANGUAGES.forEach((lang, i) => {
    const item = document.createElement('div');
    item.className = `slash-item${i === 0 ? ' active' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'slash-item-icon';
    icon.textContent = lang.icon;
    const label = document.createElement('span');
    label.className = 'slash-item-label';
    label.textContent = lang.label;
    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
      onSelect(lang.id);
    });
    pickerPopup.appendChild(item);
  });

  keyHandler = (e) => {
    if (!pickerPopup) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); movePickerSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); movePickerSel(-1); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && !e.isComposing) {
      e.preventDefault(); e.stopPropagation();
      const lang = CODE_LANGUAGES[pickerIdx]?.id ?? '';
      close();
      onSelect(lang);
    }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };

  pickerDocHandler = (e) => {
    if (pickerPopup && !pickerPopup.contains(e.target)) close();
  };

  ta.addEventListener('keydown', keyHandler);
  document.addEventListener('pointerdown', pickerDocHandler);

  const coords = getCaretCoords(ta);
  pickerPopup.style.left = `${coords.left}px`;
  pickerPopup.style.top = `${coords.top}px`;
  document.body.appendChild(pickerPopup);
}

function showPopup(ta, commands) {
  hidePopup();
  popup = document.createElement('div');
  popup.className = 'slash-popup';

  commands.forEach((cmd, i) => {
    const item = document.createElement('div');
    item.className = `slash-item${i === 0 ? ' active' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'slash-item-icon';
    icon.textContent = cmd.icon;
    const label = document.createElement('span');
    label.className = 'slash-item-label';
    label.textContent = cmd.label;
    item.appendChild(icon);
    item.appendChild(label);
    item.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cmd.id === 'codeblock') {
        const savedSlashPos = slashPos;
        hidePopup();
        showCodeBlockPicker(ta, (lang) => applyCodeblockAtSlashPos(ta, savedSlashPos, lang));
      } else {
        applyCommand(ta, cmd.id);
      }
    });
    popup.appendChild(item);
  });

  docDownHandler = (e) => {
    if (popup && !popup.contains(e.target)) hidePopup();
  };
  document.addEventListener('pointerdown', docDownHandler);

  const coords = getCaretCoords(ta);
  popup.style.left = `${coords.left}px`;
  popup.style.top = `${coords.top}px`;
  document.body.appendChild(popup);
}

function hidePopup() {
  if (docDownHandler) {
    document.removeEventListener('pointerdown', docDownHandler);
    docDownHandler = null;
  }
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
    top: Math.min(approxTop, window.innerHeight - 320),
  };
}
