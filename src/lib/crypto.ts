import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

// Key registry — add future keys here with incrementing version numbers.
// The active key (highest version) is used for all new encryptions.
// Old keys are kept for decryption of existing ciphertext.
const KEY_VERSIONS: Record<string, string | undefined> = {
  v1: process.env.VAULT_ENCRYPTION_KEY,
};
const ACTIVE_VERSION = "v1";

function getKey(version: string): Buffer {
  const hex = KEY_VERSIONS[version];
  if (!hex || hex.length !== 64) {
    throw new Error(`Encryption key for ${version} is missing or invalid.`);
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts plaintext and returns `v1:iv:tag:ciphertext` (all hex).
 * Returns an empty string for empty/nullish input.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey(ACTIVE_VERSION);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ACTIVE_VERSION}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a ciphertext produced by `encrypt`.
 * Handles both the legacy 3-part format (iv:tag:ciphertext) and the
 * current 4-part versioned format (v1:iv:tag:ciphertext).
 * Returns an empty string for empty/nullish input.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  const parts = ciphertext.split(":");

  let version: string;
  let ivHex: string, tagHex: string, dataHex: string;

  if (parts.length === 4) {
    [version, ivHex, tagHex, dataHex] = parts;
  } else if (parts.length === 3) {
    // Legacy format written before versioning was introduced
    version = "v1";
    [ivHex, tagHex, dataHex] = parts;
  } else {
    throw new Error("Invalid ciphertext format.");
  }

  const key = getKey(version);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
