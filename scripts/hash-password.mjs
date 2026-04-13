import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "SuaSenhaForte"');
  process.exit(1);
}

if (password.length < 8 || password.length > 128) {
  console.error("A senha deve ter entre 8 e 128 caracteres.");
  process.exit(1);
}

const N = 16384;
const r = 8;
const p = 1;
const keyLen = 64;
const salt = randomBytes(16).toString("hex");
const derived = scryptSync(password, salt, keyLen, { N, r, p }).toString("hex");

console.log(`scrypt$${N}$${r}$${p}$${salt}$${derived}`);
