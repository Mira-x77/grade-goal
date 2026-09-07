// Test deleting "learn ui design" course
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  const courseId = 'd29a6a0b-dd20-4ab4-98bd-d60528e899c1'; // "learn ui design"
  
  console.log(`🗑️  Attempting to delete course: ${courseId}\n`);
  
  const { data, error } = await supabase
    .from('course_posts')
    .delete()
    .eq('id', courseId)
    .select();

  if (error) {
    console.error('❌ Delete failed:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
  } else {
    console.log('✅ Delete successful!');
    console.log('Deleted data:', data);
  }

  // Verify deletion
  console.log('\n🔍 Verifying deletion...');
  const { data: check } = await supabase
    .from('course_posts')
    .select('id, title')
    .eq('id', courseId);

  if (!check || check.length === 0) {
    console.log('✅ Course successfully removed from database');
  } else {
    console.log('⚠️ Course still exists:', check);
  }
}

testDelete().then(() => process.exit(0)).catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
