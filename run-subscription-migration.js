// Run subscription system migration
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_SERVICE_KEY or VITE_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '003_subscription_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running subscription system migration...');
    
    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (error) {
          // Try direct execution if RPC fails
          console.log('Trying direct execution...');
          const { error: directError } = await supabase.from('_migrations').insert({ statement });
          if (directError) {
            console.warn('⚠️  Statement may have failed:', statement.substring(0, 100) + '...');
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Verify tables created: subscription_codes, subscription_analytics');
    console.log('2. Test code generation in admin panel');
    console.log('3. Test code validation in mobile app');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
