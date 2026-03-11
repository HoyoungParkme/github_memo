export async function sha256(text) {
  if (window.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const hash = await window.crypto.subtle.digest('SHA-256', bytes);
    return `wc:${Array.from(new Uint8Array(hash)).map(toHex).join('')}`;
  }
  return `fb:${fallbackHash(text)}`;
}

function fallbackHash(value) {
  let h1 = 0x811c9dc5;
  let h2 = 0x9dc5811c;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ (code * 31), 0x00000193);
  }
  return [
    h1 >>> 0,
    h2 >>> 0,
    Math.imul(h1 ^ h2, 0x45d9f3b) >>> 0,
    Math.imul(h2 ^ h1, 0xd9f3b45) >>> 0,
  ].map((part) => part.toString(16).padStart(8, '0')).join('');
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}
