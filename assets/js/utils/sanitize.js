const allowedTags = new Set([
  'a', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'img', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'ul',
]);

const allowedAttrs = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title']),
  code: new Set(['class']),
  pre: new Set(['class']),
};

export function sanitizeHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  walk(container);
  return container.innerHTML;
}

function walk(root) {
  Array.from(root.childNodes).forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    sanitizeElement(node);
    walk(node);
  });
}

function sanitizeElement(element) {
  const tag = element.tagName.toLowerCase();
  if (!allowedTags.has(tag)) {
    element.replaceWith(document.createTextNode(element.textContent || ''));
    return;
  }

  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    const value = attribute.value.trim();
    const isAllowed = allowedAttrs[tag]?.has(name);
    if (!isAllowed) {
      element.removeAttribute(attribute.name);
      return;
    }
    if ((name === 'href' || name === 'src') && !isSafeUrl(value)) {
      element.removeAttribute(attribute.name);
    }
  });

  if (tag === 'a' && element.getAttribute('href')) {
    element.setAttribute('target', '_blank');
    element.setAttribute('rel', 'noopener noreferrer');
  }
}

function isSafeUrl(value) {
  return /^(https?:|mailto:|#|\/)/i.test(value);
}
