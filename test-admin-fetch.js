// Test what the admin service actually fetches
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminFetch() {
  console.log('📥 Admin: Fetching all papers from Supabase...');
  
  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Admin: Failed to fetch papers:', error);
    return;
  }

  console.log(`✅ Admin: Fetched ${data?.length || 0} papers from Supabase`);
  
  if (data && data.length > 0) {
    console.log('\n📋 First 3 papers:');
    data.slice(0, 3).forEach((paper, i) => {
      console.log(`\n${i + 1}. ${paper.title}`);
      console.log(`   ID: ${paper.id}`);
      console.log(`   Subject: ${paper.subject}`);
      console.log(`   Class: ${paper.class_level}`);
      console.log(`   Year: ${paper.year}`);
      console.log(`   Type: ${paper.exam_type}`);
      console.log(`   Session: ${paper.session}`);
      console.log(`   System: ${paper.system || 'NOT SET'}`);
      console.log(`   File URL: ${paper.file_url ? 'YES' : 'NO'}`);
    });
    
    // Check if any papers are missing the 'system' field
    const missingSystem = data.filter(p => !p.system);
    console.log(`\n⚠️ Papers without 'system' field: ${missingSystem.length}`);
    if (missingSystem.length > 0) {
      console.log('These papers are missing system:', missingSystem.map(p => p.title));
    }
  } else {
    console.log('⚠️ No papers returned from query!');
  }
}

testAdminFetch().catch(console.error);
