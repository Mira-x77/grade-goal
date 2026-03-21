// Quick test to verify Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'sb_publishable_LUrbSa1VJkrlfC_m8arz1Q_dCQQAKOa';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Testing Supabase connection...');

// Test 1: Check if we can connect
try {
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
  } else {
    console.log('✅ Connected to Supabase successfully!');
    console.log('📦 Available buckets:', data.map(b => b.name).join(', ') || 'None');
    
    // Check if exam-papers bucket exists
    const examPapersBucket = data.find(b => b.name === 'exam-papers');
    if (examPapersBucket) {
      console.log('✅ exam-papers bucket found!');
      console.log('   Public:', examPapersBucket.public);
    } else {
      console.log('⚠️  exam-papers bucket NOT found. Please create it in Supabase dashboard.');
    }
  }
} catch (err) {
  console.error('❌ Connection test failed:', err.message);
}
