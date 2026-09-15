const assert = require('node:assert/strict');
const test = require('node:test');
const { createAccessToken, hashAccessToken, hashPassword, verifyPassword } = require('./auth');

test('password hashes are salted and verify only the original password', () => {
  const firstHash = hashPassword('123456');
  const secondHash = hashPassword('123456');

  assert.notEqual(firstHash, secondHash);
  assert.equal(verifyPassword('123456', firstHash), true);
  assert.equal(verifyPassword('wrong-password', firstHash), false);
});

test('access tokens are random and stored as one-way hashes', () => {
  const token = createAccessToken();
  assert.ok(token.length >= 40);
  assert.notEqual(token, hashAccessToken(token));
  assert.equal(hashAccessToken(token), hashAccessToken(token));
});
