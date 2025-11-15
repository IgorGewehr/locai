#!/usr/bin/env node
/**
 * Generate a secure random CRON_SECRET
 *
 * Usage:
 *   node scripts/generate-cron-secret.js
 *
 * This generates a cryptographically secure random string
 * to be used as the CRON_SECRET in your .env file
 */

const crypto = require('crypto');

// Generate a 32-byte random string (256 bits of entropy)
const secret = crypto.randomBytes(32).toString('base64url');

console.log('\n🔐 Generated CRON_SECRET:\n');
console.log(secret);
console.log('\n📋 Add this to your .env file:');
console.log(`CRON_SECRET=${secret}`);
console.log('\n⚠️  Keep this secret secure! Do not commit to Git.\n');
