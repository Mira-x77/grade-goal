/**
 * Test script to verify exam_papers table access and RLS policies
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

async function main() {
  console.log('🔍 Testing exam_papers table access with ANON key...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test 1: Get count
  console.log('Test 1: Count all papers');
  const { count, error: countError } = await supabase
    .from('exam_papers')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Count error:', countError.message);
    console.error('   Details:', countError);
  } else {
    console.log('✅ Total count:', count);
  }
  
  // Test 2: Select all
  console.log('\nTest 2: Select all papers');
  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ Select error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
  } else {
    console.log('✅ Retrieved:', data?.length, 'papers');
    if (data && data.length > 0) {
      console.log('\nFirst paper:');
      console.log('  ID:', data[0].id);
      console.log('  Title:', data[0].title);
      console.log('  Class:', data[0].class_level);
      console.log('  Subject:', data[0].subject);
    }
  }
  
  // Test 3: Check table schema
  console.log('\nTest 3: Checking if RLS is enabled');
  const { data: tableInfo, error: schemaError } = await supabase
    .rpc('check_table_rls', { table_name: 'exam_papers' })
    .maybeSingle();
    
  if (schemaError) {
    console.log('⚠️  Cannot check RLS (function may not exist):', schemaError.message);
  } else {
    console.log('   RLS status:', tableInfo);
  }
}

main().catch(console.error);
