import { base64ToBytes, bytesToBase64 } from '../utils/encoding.js';

const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 250000;

export async function encryptJson(payload, password) {
  ensureCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return {
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptJson(secret, password) {
  ensureCrypto();
  const key = await deriveKey(password, base64ToBytes(secret.salt));
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(secret.iv) },
    key,
    base64ToBytes(secret.data),
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function ensureCrypto() {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto를 지원하는 최신 브라우저가 필요합니다.');
  }
}
