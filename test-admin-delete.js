// Test deleting with service role key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3MDA0OSwiZXhwIjoyMDg4MDQ2MDQ5fQ.8YlrC1gJEkKXdj6wix0JY8nFUveb9XXW8PZQj8MgBTc';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testDelete() {
  const courseId = 'd29a6a0b-dd20-4ab4-98bd-d60528e899c1'; // "learn ui design"
  
  console.log(`🗑️  Testing delete with service role key: ${courseId}\n`);
  
  const { data, error } = await supabaseAdmin
    .from('course_posts')
    .delete()
    .eq('id', courseId)
    .select();

  if (error) {
    console.error('❌ Delete failed:', error);
  } else {
    console.log('✅ Delete successful!');
    console.log('Deleted:', data);
  }

  // Verify deletion
  console.log('\n🔍 Verifying deletion...');
  const { data: check } = await supabaseAdmin
    .from('course_posts')
    .select('id, title')
    .eq('id', courseId);

  if (!check || check.length === 0) {
    console.log('✅ Course successfully removed from database');
  } else {
    console.log('❌ Course still exists:', check);
  }

  // Show remaining courses
  console.log('\n📚 Remaining courses:');
  const { data: all } = await supabaseAdmin
    .from('course_posts')
    .select('id, title, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  all?.forEach((course, i) => {
    console.log(`   ${i + 1}. "${course.title}"`);
  });
}

testDelete().then(() => process.exit(0)).catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
