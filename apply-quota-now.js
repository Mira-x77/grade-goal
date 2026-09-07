// Apply quota migration directly using Supabase client
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Applying quota migration via REST API...\n');

  const sql = fs.readFileSync('./supabase/migrations/010_download_quota_system.sql', 'utf8');

  try {
    // Try to execute via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log('✅ Migration applied successfully via REST API!');
    } else {
      const error = await response.text();
      console.log('⚠️  REST API failed:', error);
      console.log('\n📋 Manual application required:');
      console.log('1. Go to: https://supabase.com/dashboard');
      console.log('2. Select project: aaayzhvqgqptgqaxxbdh');
      console.log('3. SQL Editor → New Query');
      console.log('4. Copy contents of: supabase/migrations/010_download_quota_system.sql');
      console.log('5. Paste and Run');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Manual application required - see instructions above');
  }

  // Test if functions exist
  console.log('\n🧪 Testing if functions exist...');
  
  const { data, error } = await supabase.rpc('get_download_quota_status', {
    p_device_id: 'test-device'
  });

  if (error) {
    console.log('❌ Functions not available:', error.message);
    console.log('\n⚠️  You MUST apply the migration manually via Supabase Dashboard');
    console.log('    See: APPLY_MIGRATIONS_MANUALLY.md');
  } else {
    console.log('✅ Functions are working!');
    console.log('   Test result:', data);
  }
}

applyMigration();
