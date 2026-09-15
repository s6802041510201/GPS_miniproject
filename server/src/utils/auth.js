const crypto = require('node:crypto');

const PASSWORD_ALGORITHM = 'scrypt';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(String(password), salt, 64);
  return `${PASSWORD_ALGORITHM}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string') return false;

  const [algorithm, saltHex, hashHex] = storedHash.split('$');
  if (algorithm !== PASSWORD_ALGORITHM || !saltHex || !hashHex) return false;

  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(String(password), salt, expected.length);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function createAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashAccessToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { createAccessToken, hashAccessToken, hashPassword, verifyPassword };
