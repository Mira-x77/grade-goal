/**
 * Quick diagnostic to check Supabase data
 * Run with: npx tsx check-supabase-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('🔍 Checking Supabase Data...\n');

  // Check exam_papers table
  console.log('📄 EXAM PAPERS:');
  const { data: examPapers, error: examError } = await supabase
    .from('exam_papers')
    .select('*', { count: 'exact' });

  if (examError) {
    console.log('  ❌ Error:', examError.message);
  } else {
    console.log(`  ✅ Found: ${examPapers?.length || 0} records`);
    if (examPapers && examPapers.length > 0) {
      console.log(`  📋 Sample titles:`);
      examPapers.slice(0, 3).forEach((p: any) => {
        console.log(`     - ${p.title} (${p.subject}, ${p.year})`);
      });
    }
  }

  console.log('');

  // Check library_books table
  console.log('📚 LIBRARY BOOKS:');
  const { data: books, error: booksError } = await supabase
    .from('library_books')
    .select('*', { count: 'exact' });

  if (booksError) {
    console.log('  ❌ Error:', booksError.message);
  } else {
    console.log(`  ✅ Found: ${books?.length || 0} records`);
    if (books && books.length > 0) {
      console.log(`  📋 Sample titles:`);
      books.slice(0, 3).forEach((b: any) => {
        console.log(`     - ${b.title} by ${b.author || 'Unknown'}`);
      });
    }
  }

  console.log('');
  console.log('📊 SUMMARY:');
  console.log(`  Total Exam Papers: ${examPapers?.length || 0}`);
  console.log(`  Total Books: ${books?.length || 0}`);
  console.log(`  Total PDFs: ${(examPapers?.length || 0) + (books?.length || 0)}`);
  console.log('');

  if ((examPapers?.length || 0) + (books?.length || 0) === 0) {
    console.log('⚠️  No data found! Your 63 PDFs might be:');
    console.log('   1. In a different table');
    console.log('   2. Not uploaded yet');
    console.log('   3. Using a different Supabase project');
  }
}

checkData().catch(console.error);
