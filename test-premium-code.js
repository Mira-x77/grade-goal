// Test premium code activation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, anonKey);

async function testPremiumCode() {
  console.log('🔍 Testing Premium Code System\n');

  // Step 1: Check available codes
  console.log('1️⃣ Fetching available subscription codes...');
  const { data: codes, error: codesError } = await supabase
    .from('subscription_codes')
    .select('*')
    .eq('is_redeemed', false)
    .limit(5);

  if (codesError) {
    console.error('❌ Error fetching codes:', codesError);
    return;
  }

  console.log(`✅ Found ${codes?.length || 0} unredeemed codes\n`);

  if (!codes || codes.length === 0) {
    console.log('⚠️ No codes available - generate some in admin panel first');
    console.log('   Go to: http://127.0.0.1:3001/subscription-codes');
    return;
  }

  // Show codes by duration
  const codesByDuration = codes.reduce((acc, code) => {
    const duration = code.duration_months || 1;
    if (!acc[duration]) acc[duration] = [];
    acc[duration].push(code);
    return acc;
  }, {});

  console.log('Available codes by duration:');
  Object.keys(codesByDuration).sort((a, b) => Number(a) - Number(b)).forEach(duration => {
    console.log(`  ${duration} month(s): ${codesByDuration[duration].length} codes`);
    console.log(`    Example: ${codesByDuration[duration][0].code}`);
  });

  // Step 2: Test code validation (1-month code)
  const testCode = codes.find(c => c.duration_months === 1) || codes[0];
  console.log(`\n2️⃣ Testing code: ${testCode.code} (${testCode.duration_months} month(s))`);

  const testDeviceId = `test-device-${Date.now()}`;
  
  try {
    const { data: result, error: rpcError } = await supabase.rpc('use_subscription_code', {
      p_code: testCode.code,
      p_device_id: testDeviceId,
      p_user_id: null,
      p_grading_system: 'apc',
      p_school: null,
      p_code_source: 'manual',
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      return;
    }

    const row = Array.isArray(result) ? result[0] : result;
    
    if (row.success) {
      console.log('✅ Code activated successfully!');
      console.log(`   Duration: ${row.duration_months} month(s)`);
      console.log(`   Expires: ${row.expires_at}`);
      console.log(`   Message: ${row.message}`);

      // Calculate days until expiration
      const expiryDate = new Date(row.expires_at);
      const now = new Date();
      const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      console.log(`   Days remaining: ${daysRemaining}`);

      // Verify code is now redeemed
      const { data: usedCode } = await supabase
        .from('subscription_codes')
        .select('is_redeemed, redeemed_at, device_id')
        .eq('code', testCode.code)
        .single();

      console.log(`\n✅ Code verified as redeemed:`);
      console.log(`   Redeemed: ${usedCode?.is_redeemed}`);
      console.log(`   Redeemed at: ${usedCode?.redeemed_at}`);
      console.log(`   Device ID: ${usedCode?.device_id}`);

    } else {
      console.log('❌ Code activation failed:', row.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }

  // Step 3: Check download quota with premium
  console.log('\n3️⃣ Checking download quota...');
  
  const { data: quota, error: quotaError } = await supabase.rpc('get_download_quota_status', {
    p_device_id: testDeviceId,
  });

  if (quotaError) {
    console.error('❌ Quota error:', quotaError);
  } else {
    console.log('✅ Download quota status:');
    console.log(`   Downloads used: ${quota.downloads_used || 0}`);
    console.log(`   Quota limit: ${quota.quota_limit || 5}`);
    console.log(`   Has premium: ${quota.has_premium || false}`);
    console.log(`   Can download: ${quota.can_download}`);
    
    if (quota.has_premium) {
      console.log('   🎉 Premium user - unlimited downloads!');
    } else {
      console.log(`   📊 Free user - ${quota.quota_limit - quota.downloads_used} downloads remaining`);
    }
  }
}

testPremiumCode().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
