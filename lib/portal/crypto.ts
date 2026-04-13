import {
  createCipheriv,
  createHash,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { getPortalJwtSecret } from "@/lib/portal/env";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

async function deriveScrypt(
  password: string,
  salt: string,
  keyLen: number,
  n: number,
  r: number,
  p: number,
) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLen,
      { N: n, r, p },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey as Buffer);
      },
    );
  });
}

export async function hashPassword(password: string) {
  if (password.length < 8 || password.length > 128) {
    throw new Error("A senha deve ter entre 8 e 128 caracteres.");
  }

  const salt = randomBytes(16).toString("hex");
  const derived = await deriveScrypt(
    password,
    salt,
    SCRYPT_KEYLEN,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
  );

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString(
    "hex",
  )}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  const [, nRaw, rRaw, pRaw, salt, expectedHex] = parts;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);

  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  if (!expected.length) return false;

  const derived = await deriveScrypt(password, salt, expected.length, n, r, p);

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
}

export function generatePortalToken() {
  const raw = randomBytes(12).toString("hex").toUpperCase();
  return `${raw.slice(0, 6)}-${raw.slice(6, 12)}-${raw.slice(
    12,
    18,
  )}-${raw.slice(18, 24)}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getTokenEncryptionKey() {
  return createHash("sha256")
    .update(`${getPortalJwtSecret()}:portal-token:v1`, "utf8")
    .digest();
}

export function encryptTokenForStorage(token: string) {
  if (!token) return null;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTokenFromStorage(ciphertext: string | null | undefined) {
  if (!ciphertext) return null;

  const parts = String(ciphertext).split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;

  try {
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const encrypted = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", getTokenEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
