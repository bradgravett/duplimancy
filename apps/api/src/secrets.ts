import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { WORDS_A, WORDS_B } from './words.ts';

export function newToken(): string {
  return randomBytes(24).toString('base64url');
}

export function hashToken(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export function tokenMatches(token: string, hash: Buffer): boolean {
  const h = hashToken(token);
  return h.length === hash.length && timingSafeEqual(h, hash);
}

/** e.g. "gilded-wyrm-hollow-42". ~3.7M combinations before the numeric suffix. */
export function newSlug(): string {
  const a = WORDS_A[randomInt(WORDS_A.length)]!;
  const b = WORDS_B[randomInt(WORDS_B.length)]!;
  let c = WORDS_B[randomInt(WORDS_B.length)]!;
  while (c === b) c = WORDS_B[randomInt(WORDS_B.length)]!;
  return `${a}-${b}-${c}-${randomInt(10, 100)}`;
}

export const SLUG_RE = /^[a-z]+(?:-[a-z]+){2}-\d{2}$/;
