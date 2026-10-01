#!/usr/bin/env node
/**
 * Hash an admin password for the Sea Birds catalogue API.
 *
 * Prints the exact `pbkdf2$100000$<base64url salt>$<base64url hash>` format
 * that the Worker's auth module (src/lib/auth.ts) verifies:
 *   - PBKDF2-SHA-256, 100 000 iterations
 *   - 32-byte random salt, 32-byte derived key
 *
 * USAGE (run locally on the admin's own machine — never on a server, and
 * never commit the output):
 *
 *   node scripts/hash-password.mjs 'choose-a-strong-password'
 *
 * Then EITHER:
 *   a) paste the printed string over the PENDING_SEED__RUN_SCRIPTS_HASH_PASSWORD
 *      value in migrations/0002_seed.sql BEFORE running the first migration, OR
 *   b) apply the seed migration first, then update the row directly:
 *        wrangler d1 execute sea_birds_db --config ../wrangler.toml \
 *          --command "UPDATE admin_users SET password_hash = 'pbkdf2$100000$...' WHERE email = 'admin@example.com';"
 *
 * Also change the placeholder admin email to the real address.
 */

import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.mjs 'your-strong-password'");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Refusing: password must be at least 12 characters.");
  process.exit(1);
}

const salt = randomBytes(32);
const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");

console.log(`pbkdf2$100000$${salt.toString("base64url")}$${hash.toString("base64url")}`);
