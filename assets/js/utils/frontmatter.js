export function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf('\n---', 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter = {};
  content.slice(4, endIndex).split('\n').forEach((line) => {
    const separator = line.indexOf(':');
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    frontmatter[key] = parseValue(rawValue);
  });

  return {
    frontmatter,
    body: content.slice(endIndex + 5).trimStart(),
  };
}

export function buildFrontmatter(frontmatter) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return '';
  const lines = ['---'];
  Object.entries(frontmatter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map((item) => `"${item}"`).join(', ')}]`);
      return;
    }
    lines.push(`${key}: "${String(value).replace(/"/g, '\\"')}"`);
  });
  lines.push('---', '');
  return lines.join('\n');
}

function parseValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value.slice(1, -1).split(',').map(normalizeItem).filter(Boolean);
  }
  return value.replace(/^['"]|['"]$/g, '');
}

function normalizeItem(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}
