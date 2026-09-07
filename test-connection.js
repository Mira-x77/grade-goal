import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Testing Supabase connection...\n');

// Test 1: Count papers
const { count, error: countError } = await supabase
  .from('exam_papers')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.error('❌ ERROR:', countError.message);
  process.exit(1);
}

console.log(`✅ Connection works!`);
console.log(`📊 Total papers in database: ${count}\n`);

if (count === 0) {
  console.log('⚠️  DATABASE IS EMPTY - Need to run migration 017');
  console.log('\nGo to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/sql');
  console.log('Run the SQL from: supabase/migrations/017_seed_exam_papers.sql\n');
  process.exit(0);
}

// Test 2: Fetch papers
const { data, error } = await supabase
  .from('exam_papers')
  .select('title, class_level, subject, year')
  .order('class_level', { ascending: true });

if (error) {
  console.error('❌ FETCH ERROR:', error.message);
  process.exit(1);
}

// Count by class level
const byClass = {};
data.forEach(p => {
  byClass[p.class_level] = (byClass[p.class_level] || 0) + 1;
});

console.log('📈 Papers by class level:');
Object.entries(byClass).sort().forEach(([level, count]) => {
  console.log(`  ${level}: ${count} papers`);
});

console.log(`\n✅ SUCCESS: ${count} papers ready to display`);
