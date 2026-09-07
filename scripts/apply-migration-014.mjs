/**
 * One-time migration runner for 014_fix_quota_and_subscription.sql
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set in .env or as an env var.
 * Run with:  node scripts/apply-migration-014.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

config(); // load .env

const __dir = dirname(fileURLToPath(import.meta.url));

const url  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('    Add SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> to .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false }
});

const sql = readFileSync(
  join(__dir, '../supabase/migrations/014_fix_quota_and_subscription.sql'),
  'utf8'
);

console.log('🔄  Applying migration 014_fix_quota_and_subscription …');

const { error } = await supabase.rpc('exec_sql', { sql });

if (error) {
  // exec_sql may not exist — fall back to direct REST
  console.warn('exec_sql RPC not available, trying pg REST endpoint …');
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ sql }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('❌  Migration failed:', body);
    console.error('\n👉  Please run the SQL manually in the Supabase SQL Editor:');
    console.error('    https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/sql/new');
    process.exit(1);
  }
}

console.log('✅  Migration applied successfully!');
