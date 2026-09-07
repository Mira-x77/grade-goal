// Run download quota system migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '010_download_quota_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running download quota system migration...');
    console.log('📝 This will create:');
    console.log('   - user_download_quotas table');
    console.log('   - check_premium_status function');
    console.log('   - increment_download_with_quota function');
    console.log('   - get_download_quota_status function');
    console.log('');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
        
        try {
          // Try to execute via raw query
          const { error } = await supabase.rpc('exec_sql', { 
            sql_query: statement + ';' 
          });
          
          if (error) {
            // Check if it's an "already exists" error
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate')) {
              console.log('⏭️  (already exists)');
              skipCount++;
            } else {
              console.log('⚠️  ', error.message.substring(0, 50));
            }
          } else {
            console.log('✅');
            successCount++;
          }
        } catch (err) {
          console.log('⚠️  ', err.message?.substring(0, 50) || 'Unknown error');
        }
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   ${successCount} statements executed`);
    console.log(`   ${skipCount} statements skipped (already exist)`);
    
    console.log('\n📋 Verifying functions...');
    
    // Test the function
    const { data, error } = await supabase.rpc('get_download_quota_status', {
      p_device_id: 'test-verification-device'
    });
    
    if (error) {
      console.log('⚠️  Function verification failed:', error.message);
    } else {
      console.log('✅ get_download_quota_status function works!');
      console.log('   Result:', data);
    }

    console.log('\n📋 Next steps:');
    console.log('1. Test downloading a paper in the app');
    console.log('2. Check console logs for "✅ Download count incremented"');
    console.log('3. Downloads should now be tracked with quota limits');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
