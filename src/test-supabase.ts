// Simple test to verify Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');
  
  try {
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*');
    
    if (error) {
      console.error('❌ Test failed:', error);
      return { success: false, error };
    }
    
    console.log('✅ Test successful! Found', data?.length, 'papers');
    console.log('📄 Data:', data);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Test exception:', err);
    return { success: false, error: err };
  }
}

// Auto-run test
testSupabaseConnection();
