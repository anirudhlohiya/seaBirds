import type { D1Database } from "@cloudflare/workers-types";
import { queryOne, run } from "./db";

/**
 * Password hashing: PBKDF2-SHA-256, 100 000 iterations,
 * 32-byte salt, 32-byte derived key (matches scripts/hash-password.mjs).
 *
 * Stored format: `pbkdf2$100000$<base64url salt>$<base64url hash>`
 */

export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  role: string | null;
}

const ITERATIONS = 100_000;
const KEY_LEN_BYTES = 32;
const SALT_LEN_BYTES = 32;

function toB64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    KEY_LEN_BYTES * 8
  );
  return new Uint8Array(bits);
}

/** Hash a password into the canonical `pbkdf2$100000$...` string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES));
  const hash = await deriveKey(password, salt);
  return `pbkdf2$${ITERATIONS}$${toB64Url(salt)}$${toB64Url(hash)}`;
}

/** Constant-ish-time comparison of a password against a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2" || parts[1] !== String(ITERATIONS)) {
    return false;
  }
  const saltB64 = parts[2] ?? "";
  const expectedB64 = parts[3] ?? "";
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromB64Url(saltB64);
    expected = fromB64Url(expectedB64);
  } catch {
    return false;
  }
  if (salt.length !== SALT_LEN_BYTES || expected.length !== KEY_LEN_BYTES) return false;
  const actual = await deriveKey(password, salt);
  // Compare byte-by-byte, accumulating differences (no early exit).
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

/** Opaque session token with extra entropy beyond a UUID. */
export function generateToken(): string {
  const rand = toB64Url(crypto.getRandomValues(new Uint8Array(24)));
  return `${crypto.randomUUID()}_${rand}`;
}

export interface Session {
  token: string;
  admin_user_id: number;
  expires_at: string;
  created_at: string;
}

function toSqliteDateTime(d: Date): string {
  // "YYYY-MM-DD HH:MM:SS" — sortable, timezone-free (always UTC).
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Create a session row and return token + expiry. */
export async function createSession(
  db: D1Database,
  adminUserId: number,
  ttlHours: number
): Promise<{ token: string; expires_at: string }> {
  const token = generateToken();
  const ttl = Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 72;
  const expires = new Date(Date.now() + ttl * 3_600_000);
  const expires_at = toSqliteDateTime(expires);
  await run(
    db,
    "INSERT INTO sessions (token, admin_user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    token,
    adminUserId,
    expires_at,
    toSqliteDateTime(new Date())
  );
  return { token, expires_at };
}

/** Validate a session token → admin user row, or null when missing/expired. */
export async function validateSession(
  db: D1Database,
  token: string
): Promise<AdminUser | null> {
  if (!token) return null;
  const row = await queryOne<{
    id: number;
    email: string;
    password_hash: string;
    role: string | null;
  }>(
    db,
    `SELECT u.id, u.email, u.password_hash, u.role
       FROM sessions s
       JOIN admin_users u ON u.id = s.admin_user_id
      WHERE s.token = ? AND s.expires_at > ?`,
    token,
    toSqliteDateTime(new Date())
  );
  return row ?? null;
}

/** Revoke a session token. */
export async function invalidateSession(db: D1Database, token: string): Promise<void> {
  if (!token) return;
  await run(db, "DELETE FROM sessions WHERE token = ?", token);
}
