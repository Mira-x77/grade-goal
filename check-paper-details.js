import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

async function checkPaperDetails() {
  console.log('Checking paper details...\n');
  
  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data.length === 0) {
    console.log('No papers found');
    return;
  }
  
  const paper = data[0];
  console.log('Most recent paper:');
  console.log(JSON.stringify(paper, null, 2));
  
  // Check if all required fields are present
  console.log('\n=== Field Check ===');
  const requiredFields = [
    'id', 'title', 'subject', 'class_level', 'year', 'exam_type', 
    'session', 'file_url', 'file_name', 'file_size', 'file_size_formatted',
    'content_hash', 'downloads', 'created_at'
  ];
  
  requiredFields.forEach(field => {
    const value = paper[field];
    const status = value !== null && value !== undefined ? '✅' : '❌';
    console.log(`${status} ${field}: ${value}`);
  });
  
  // Check optional fields
  console.log('\n=== Optional Fields ===');
  console.log(`preview_url: ${paper.preview_url || 'null'}`);
  console.log(`tags: ${JSON.stringify(paper.tags)}`);
  console.log(`description: ${paper.description || 'null'}`);
}

checkPaperDetails();
