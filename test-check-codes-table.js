// Check subscription_codes table structure
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, anonKey);

async function checkTable() {
  console.log('🔍 Checking subscription_codes table...\n');

  // Fetch all codes to see structure
  const { data: codes, error } = await supabase
    .from('subscription_codes')
    .select('*')
    .limit(3);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!codes || codes.length === 0) {
    console.log('⚠️ No codes found - generate some in admin panel');
    console.log('   Go to: http://127.0.0.1:3001/subscription-codes\n');
    return;
  }

  console.log(`✅ Found ${codes.length} codes\n`);
  console.log('Sample code structure:');
  console.log(JSON.stringify(codes[0], null, 2));
  console.log('\n📋 Available columns:');
  Object.keys(codes[0]).forEach(key => {
    console.log(`   - ${key}: ${typeof codes[0][key]}`);
  });

  // Check download quota function
  console.log('\n🔍 Testing download quota function...');
  const testDevice = `test-${Date.now()}`;
  
  const { data: quota, error: quotaError } = await supabase.rpc('get_download_quota_status', {
    p_device_id: testDevice,
  });

  if (quotaError) {
    console.error('❌ Quota error:', quotaError);
  } else {
    console.log('✅ Quota response:');
    console.log(JSON.stringify(quota, null, 2));
  }

  // Check if use_subscription_code exists
  console.log('\n🔍 Testing use_subscription_code function...');
  const { error: rpcError } = await supabase.rpc('use_subscription_code', {
    p_code: 'TEST-CODE',
    p_device_id: testDevice,
    p_user_id: null,
    p_grading_system: null,
    p_school: null,
    p_code_source: null,
  });

  if (rpcError) {
    console.log('Function exists but returned error (expected for invalid code):');
    console.log(`   ${rpcError.message}`);
  } else {
    console.log('✅ Function exists and responds');
  }
}

checkTable().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
