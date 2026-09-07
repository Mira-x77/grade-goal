// Run downloads column migration
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
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '013_add_downloads_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running downloads column migration...');
    console.log('📝 Migration: Add downloads column to exam_papers and library_books');
    
    // Execute the entire SQL as one statement
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.log('⚠️  RPC method not available, trying direct query...');
      
      // Try using the REST API directly
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        console.log('⚠️  Direct query failed, splitting into statements...');
        
        // Split by semicolons and execute each statement
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement) {
            console.log(`Executing: ${statement.substring(0, 60)}...`);
            
            // Use raw SQL query
            const { error: stmtError } = await supabase.rpc('exec_sql', { 
              sql_query: statement + ';' 
            });
            
            if (stmtError) {
              console.warn('⚠️  Statement may have failed:', stmtError.message);
            } else {
              console.log('✅ Statement executed');
            }
          }
        }
      } else {
        console.log('✅ Migration executed via REST API');
      }
    } else {
      console.log('✅ Migration executed via RPC');
    }

    console.log('\n✅ Migration completed!');
    console.log('\n📋 Verifying changes...');
    
    // Verify the columns exist
    const { data: examPapersCheck, error: examError } = await supabase
      .from('exam_papers')
      .select('downloads')
      .limit(1);
    
    if (!examError) {
      console.log('✅ exam_papers.downloads column exists');
    } else {
      console.log('⚠️  Could not verify exam_papers.downloads:', examError.message);
    }

    const { data: booksCheck, error: booksError } = await supabase
      .from('library_books')
      .select('downloads')
      .limit(1);
    
    if (!booksError) {
      console.log('✅ library_books.downloads column exists');
    } else {
      console.log('⚠️  Could not verify library_books.downloads:', booksError.message);
    }

    console.log('\n📋 Next steps:');
    console.log('1. Test downloading a paper in the app');
    console.log('2. Check console logs for "✅ Download count incremented"');
    console.log('3. Verify downloads column is incrementing in database');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
