import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

async function checkURLs() {
  console.log('Checking file URLs...\n');
  
  const { data, error } = await supabase
    .from('exam_papers')
    .select('id, title, file_url, file_name')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Papers and their URLs:\n');
  data.forEach((p, i) => {
    console.log(`${i+1}. ${p.title}`);
    console.log(`   File: ${p.file_name}`);
    console.log(`   Full URL: ${p.file_url}`);
    console.log('');
  });
  
  // Test if URLs are accessible
  console.log('Testing URL accessibility...\n');
  for (const paper of data) {
    try {
      const response = await fetch(paper.file_url, { method: 'HEAD' });
      console.log(`${paper.title}: ${response.ok ? '✅ Accessible' : '❌ Not accessible'} (${response.status})`);
    } catch (err) {
      console.log(`${paper.title}: ❌ Error - ${err.message}`);
    }
  }
}

checkURLs();
