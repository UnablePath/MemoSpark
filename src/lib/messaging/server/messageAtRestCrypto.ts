/**
 * Server-only AES-256-GCM for message bodies at rest in Postgres.
 * Requires MESSAGING_ENCRYPTION_KEY (no NEXT_PUBLIC_). Never import from client components.
 */

import { AT_REST_ENVELOPE_PREFIX } from '@/lib/messaging/atRestEnvelopeShared';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ENVELOPE_PREFIX = AT_REST_ENVELOPE_PREFIX;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function isMessagingAtRestEncryptionConfigured(): boolean {
  const key = process.env.MESSAGING_ENCRYPTION_KEY?.trim();
  return Boolean(key && key.length >= 16);
}

export function isEncryptedAtRestEnvelope(stored: string | null | undefined): boolean {
  return typeof stored === 'string' && stored.startsWith(ENVELOPE_PREFIX);
}

function deriveKeyFromSecret(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Returns ciphertext string stored in messages.content with prefix ms1:
 */
export function encryptMessageContentAtRest(plaintext: string): string {
  const raw = process.env.MESSAGING_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error(
      'MESSAGING_ENCRYPTION_KEY must be set (min 16 characters) for at-rest message encryption.',
    );
  }
  const key = deriveKeyFromSecret(raw);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, ciphertext]);
  return ENVELOPE_PREFIX + combined.toString('base64url');
}

/**
 * Decrypts ms1: envelope or returns the string unchanged (legacy plaintext rows).
 */
export function decryptMessageContentAtRest(stored: string): string {
  if (!isEncryptedAtRestEnvelope(stored)) {
    return stored;
  }
  const raw = process.env.MESSAGING_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) {
    throw new Error('MESSAGING_ENCRYPTION_KEY is missing but ciphertext was encountered.');
  }
  const key = deriveKeyFromSecret(raw);
  const combined = Buffer.from(stored.slice(ENVELOPE_PREFIX.length), 'base64url');
  if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted message payload.');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function encryptIfConfigured(plaintext: string): { content: string; encrypted: boolean } {
  if (!isMessagingAtRestEncryptionConfigured()) {
    return { content: plaintext, encrypted: false };
  }
  return { content: encryptMessageContentAtRest(plaintext), encrypted: true };
}

export function decryptIfNeeded(stored: string, rowEncryptedFlag: boolean | null): string {
  if (isEncryptedAtRestEnvelope(stored)) {
    try {
      return decryptMessageContentAtRest(stored);
    } catch {
      return '[Message could not be decrypted]';
    }
  }
  if (rowEncryptedFlag) {
    try {
      return decryptMessageContentAtRest(stored);
    } catch {
      return stored;
    }
  }
  return stored;
}
