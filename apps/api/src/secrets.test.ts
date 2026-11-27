import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashToken, newSlug, newToken, SLUG_RE, tokenMatches } from './secrets.ts';

test('slugs are well-formed', () => {
  for (let i = 0; i < 200; i++) assert.match(newSlug(), SLUG_RE);
});

test('token hash round-trips', () => {
  const t = newToken();
  assert.ok(t.length >= 32);
  assert.ok(tokenMatches(t, hashToken(t)));
  assert.ok(!tokenMatches(newToken(), hashToken(t)));
});
