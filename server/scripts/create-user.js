require('dotenv').config({ quiet: true });

const { database } = require('../src/database/database');
const { hashPassword } = require('../src/utils/auth');

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => {
  if (!value.startsWith('--')) return pairs;
  pairs.push([value.slice(2), values[index + 1] ?? '']);
  return pairs;
}, []));

const role = args.role || 'teacher';
const userCode = String(args.code || '').trim();
const name = String(args.name || '').trim();
const email = String(args.email || '').trim().toLowerCase();
const password = String(args.password || '');

if (!['student', 'teacher'].includes(role) || !userCode || !name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
  console.error('Usage: node scripts/create-user.js --role teacher|student --code USER_CODE --name "Full Name" --email user@example.com --password "AtLeast8Chars"');
  process.exit(1);
}

try {
  database.prepare(
    `INSERT INTO users (user_code, name, email, password, password_hash, role)
     VALUES (?, ?, ?, '', ?, ?)`,
  ).run(userCode, name, email, hashPassword(password), role);
  console.log(`Created ${role} account ${userCode}.`);
} catch (error) {
  console.error(error.code === 'SQLITE_CONSTRAINT_UNIQUE' ? 'The user code or email already exists.' : error.message);
  process.exit(1);
}
