import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

async function testInsert() {
  console.log('Testing database insert with content_hash...\n');
  
  const testData = {
    title: 'Test Paper',
    subject: 'Mathématiques',
    class_level: 'Sixième',
    year: 2024,
    exam_type: 'Composition',
    session: '1st Semester',
    file_url: 'https://test.com/test.pdf',
    file_name: 'test.pdf',
    file_size: 1000,
    file_size_formatted: '1 KB',
    content_hash: 'abc123def456',  // Added content_hash
    preview_url: null,
    tags: [],
    description: '',
    downloads: 0
  };
  
  console.log('Attempting to insert:', testData);
  
  const { data, error } = await supabase
    .from('exam_papers')
    .insert(testData)
    .select();
  
  if (error) {
    console.error('\n❌ INSERT FAILED:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
  } else {
    console.log('\n✅ INSERT SUCCESSFUL:');
    console.log('Inserted data:', data);
    
    // Clean up - delete the test record
    const { error: deleteError } = await supabase
      .from('exam_papers')
      .delete()
      .eq('id', data[0].id);
    
    if (!deleteError) {
      console.log('✅ Test record cleaned up');
    }
  }
}

testInsert();
