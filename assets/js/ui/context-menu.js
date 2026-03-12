let activeMenu = null;

export function showContextMenu(x, y, items) {
  hideContextMenu();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  items.forEach(({ label, action, danger }) => {
    const btn = document.createElement('button');
    btn.className = `context-menu-item${danger ? ' danger' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', (e) => { e.stopPropagation(); hideContextMenu(); action(); });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  activeMenu = menu;
  requestAnimationFrame(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
    document.addEventListener('contextmenu', hideContextMenu, { once: true });
  });
}

export function hideContextMenu() {
  activeMenu?.remove();
  activeMenu = null;
}
