import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

async function checkData() {
  console.log('Checking database...\n');
  
  const { data, error } = await supabase
    .from('exam_papers')
    .select('id, title, class_level, file_url, file_name')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Total papers in database:', data.length);
  console.log('\nAll papers:');
  data.forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   Class: ${p.class_level}`);
    console.log(`   File: ${p.file_name}`);
    console.log(`   URL path: ${p.file_url.split('/').slice(-2).join('/')}`);
    console.log('');
  });
  
  // Check for form1/form2 pattern
  const form1Papers = data.filter(p => p.file_url.includes('form1'));
  const form2Papers = data.filter(p => p.file_url.includes('form2'));
  const otherPapers = data.filter(p => !p.file_url.includes('form1') && !p.file_url.includes('form2'));
  
  console.log('\n=== ANALYSIS ===');
  console.log('Papers in form1 folder:', form1Papers.length);
  console.log('Papers in form2 folder:', form2Papers.length);
  console.log('Papers in other locations:', otherPapers.length);
  
  if (otherPapers.length > 0) {
    console.log('\nPapers NOT in form1/form2:');
    otherPapers.forEach(p => {
      console.log(`- ${p.title} (${p.file_url.split('/').slice(-2).join('/')})`);
    });
  }
}

checkData();
