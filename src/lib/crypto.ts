/**
 * AES-256-GCM encryption for secret-bearing record fields.
 *
 * Key is loaded from VAULT_ENCRYPTION_KEY (64-char hex = 32 bytes).
 * Each encrypt call produces a fresh random 12-byte IV; the output
 * format is `iv:authTag:ciphertext` — all hex-encoded — so it is
 * safe to store in a plain TEXT/VARCHAR column.
 *
 * Usage (server-side only):
 *   const cipher = encrypt("my-secret-password")
 *   const plain  = decrypt(cipher)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = process.env.VAULT_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "VAULT_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)."
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a plaintext string and returns `iv:tag:ciphertext` (hex).
 * Returns an empty string when given an empty/nullish input so callers
 * don't need to guard individually.
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a `iv:tag:ciphertext` string produced by `encrypt`.
 * Returns an empty string for empty/nullish input.
 * Throws if the ciphertext is tampered with (GCM auth tag mismatch).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format — expected iv:tag:ciphertext");
  }
  const [ivHex, tagHex, dataHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
