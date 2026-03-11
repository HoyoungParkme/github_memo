export function byId(id) {
  return document.getElementById(id);
}

export function show(node, display = 'block') {
  node.style.display = display;
}

export function hide(node) {
  node.style.display = 'none';
}

export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

export function createNode(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text) node.textContent = options.text;
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      node.dataset[key] = value;
    });
  }
  return node;
}
