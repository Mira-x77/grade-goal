// Quick test to check courses in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCourses() {
  console.log('🔍 Fetching all courses from database...\n');
  
  const { data, error } = await supabase
    .from('course_posts')
    .select('id, title, is_active, is_featured, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data.length} courses in database:\n`);
  
  data.forEach((course, index) => {
    console.log(`${index + 1}. "${course.title}"`);
    console.log(`   ID: ${course.id}`);
    console.log(`   Active: ${course.is_active}`);
    console.log(`   Featured: ${course.is_featured}`);
    console.log(`   Created: ${new Date(course.created_at).toLocaleString()}`);
    console.log('');
  });

  // Now check only active courses (what app sees)
  const { data: activeCourses } = await supabase
    .from('course_posts')
    .select('id, title')
    .eq('is_active', true);

  console.log(`\n📱 Active courses (what app sees): ${activeCourses?.length || 0}`);
  activeCourses?.forEach((course, index) => {
    console.log(`   ${index + 1}. "${course.title}"`);
  });
}

checkCourses().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
