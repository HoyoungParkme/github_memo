let activeMenu = null;

export function showContextMenu(x, y, items) {
  hideContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  items.forEach((item) => {
    if (item.type === 'separator') {
      menu.appendChild(Object.assign(document.createElement('div'), { className: 'context-menu-sep' }));
      return;
    }
    if (item.type === 'colors') {
      const label = document.createElement('div');
      label.className = 'context-menu-color-label';
      label.textContent = item.label || '색상';
      menu.appendChild(label);
      const row = document.createElement('div');
      row.className = 'context-menu-colors';
      item.colors.forEach(({ color, title }) => {
        const dot = document.createElement('button');
        dot.className = 'context-menu-color-dot';
        dot.title = title;
        if (color) {
          dot.style.background = color;
        } else {
          dot.classList.add('reset');
          dot.textContent = '✕';
        }
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          hideContextMenu();
          item.onSelect(color);
        });
        row.appendChild(dot);
      });
      menu.appendChild(row);
      return;
    }
    const btn = document.createElement('button');
    btn.className = `context-menu-item${item.danger ? ' danger' : ''}`;
    btn.textContent = item.label;
    btn.addEventListener('click', (e) => { e.stopPropagation(); hideContextMenu(); item.action(); });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  activeMenu = menu;
  requestAnimationFrame(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  });
}

export function hideContextMenu() {
  activeMenu?.remove();
  activeMenu = null;
}
