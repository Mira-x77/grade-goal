// Comprehensive test for premium codes and download limits
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, anonKey);

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('  PREMIUM CODE & DOWNLOAD LIMIT TEST');
  console.log('═══════════════════════════════════════════════\n');

  // ========== TEST 1: Check Available Codes ==========
  console.log('📋 TEST 1: Checking Available Premium Codes');
  console.log('─────────────────────────────────────────────\n');

  const { data: codes, error: codesError } = await supabase
    .from('subscription_codes')
    .select('*')
    .eq('is_used', false)
    .limit(10);

  if (codesError) {
    console.error('❌ Error fetching codes:', codesError.message);
    console.log('\n⚠️  Generate codes first in admin panel:');
    console.log('   http://127.0.0.1:3001/subscription-codes\n');
    return;
  }

  console.log(`✅ Found ${codes?.length || 0} unused codes\n`);

  if (!codes || codes.length === 0) {
    console.log('⚠️  No codes available!');
    console.log('   Generate some in admin panel first.\n');
    return;
  }

  // Group by duration
  const byDuration = {};
  codes.forEach(code => {
    const duration = code.duration_months || 1;
    if (!byDuration[duration]) byDuration[duration] = [];
    byDuration[duration].push(code);
  });

  console.log('Available codes by duration:');
  Object.keys(byDuration).sort((a, b) => a - b).forEach(duration => {
    console.log(`  ${duration} month(s): ${byDuration[duration].length} codes`);
    console.log(`     Example: ${byDuration[duration][0].code}`);
  });

  // ========== TEST 2: Free User Download Limit ==========
  console.log('\n\n📥 TEST 2: Free User Download Limit (5 downloads)');
  console.log('─────────────────────────────────────────────\n');

  const freeDevice = `free-test-${Date.now()}`;

  console.log(`Testing with device: ${freeDevice}\n`);

  // Check initial quota
  const { data: initialQuota, error: initialError } = await supabase
    .rpc('get_download_quota_status', { p_device_id: freeDevice });

  if (initialError) {
    console.error('❌ Quota check failed:', initialError.message);
    console.log('\n⚠️  Run FIX_DOWNLOAD_QUOTA.sql in Supabase first!\n');
    return;
  }

  console.log('Initial quota status:');
  console.log(`  Downloads used: ${initialQuota.downloads_used}`);
  console.log(`  Quota limit: ${initialQuota.quota_limit}`);
  console.log(`  Has premium: ${initialQuota.has_premium}`);
  console.log(`  Can download: ${initialQuota.can_download}\n`);

  // Simulate 6 downloads
  console.log('Simulating 6 download attempts...\n');

  for (let i = 1; i <= 6; i++) {
    const { data: result, error: downloadError } = await supabase
      .rpc('increment_download_with_quota', {
        p_device_id: freeDevice,
        p_user_id: null,
        p_paper_id: null,
        p_book_id: null,
        p_grading_system: 'apc',
        p_school: null,
      });

    const status = result?.success ? '✅' : '❌';
    console.log(`  Download ${i}: ${status} ${result?.message || downloadError?.message}`);
    console.log(`     Used: ${result?.downloads_used}/${result?.quota_limit}`);

    if (i === 5) {
      console.log('     ⚠️  This was the last free download!\n');
    }

    if (i === 6 && !result?.success) {
      console.log('     🎯 Correctly blocked! Premium gate should appear.\n');
    }
  }

  // ========== TEST 3: Premium Code Activation ==========
  console.log('\n\n🎟️  TEST 3: Premium Code Activation');
  console.log('─────────────────────────────────────────────\n');

  const testCode = codes.find(c => c.duration_months === 1) || codes[0];
  const premiumDevice = `premium-test-${Date.now()}`;

  console.log(`Activating code: ${testCode.code}`);
  console.log(`Duration: ${testCode.duration_months} month(s)`);
  console.log(`Device: ${premiumDevice}\n`);

  const { data: activation, error: activationError } = await supabase
    .rpc('use_subscription_code', {
      p_code: testCode.code,
      p_device_id: premiumDevice,
      p_user_id: null,
      p_grading_system: 'apc',
      p_school: null,
      p_code_source: 'test',
    });

  if (activationError) {
    console.error('❌ Activation failed:', activationError.message);
    return;
  }

  const activationResult = Array.isArray(activation) ? activation[0] : activation;

  if (activationResult.success) {
    console.log('✅ Code activated successfully!');
    console.log(`   Duration: ${activationResult.duration_months} month(s)`);
    console.log(`   Expires: ${activationResult.expires_at}`);

    const expiryDate = new Date(activationResult.expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    console.log(`   Days remaining: ${daysRemaining}\n`);

    // ========== TEST 4: Premium Unlimited Downloads ==========
    console.log('\n📥 TEST 4: Premium User - Unlimited Downloads');
    console.log('─────────────────────────────────────────────\n');

    console.log('Testing 10 downloads (should all work)...\n');

    for (let i = 1; i <= 10; i++) {
      const { data: result, error: downloadError } = await supabase
        .rpc('increment_download_with_quota', {
          p_device_id: premiumDevice,
          p_user_id: null,
          p_paper_id: null,
          p_book_id: null,
          p_grading_system: 'apc',
          p_school: null,
        });

      const status = result?.success ? '✅' : '❌';
      console.log(`  Download ${i}: ${status} Premium user - unlimited`);

      if (!result?.success) {
        console.log(`     ❌ UNEXPECTED: Premium user blocked!`);
        console.log(`     Message: ${result?.message}`);
        break;
      }
    }

    // Check final quota
    const { data: finalQuota } = await supabase
      .rpc('get_download_quota_status', { p_device_id: premiumDevice });

    console.log('\n✅ Final premium quota status:');
    console.log(`   Downloads used: ${finalQuota.downloads_used}`);
    console.log(`   Has premium: ${finalQuota.has_premium}`);
    console.log(`   Can download: ${finalQuota.can_download} (unlimited)\n`);

  } else {
    console.log('❌ Code activation failed:', activationResult.message);
  }

  // ========== SUMMARY ==========
  console.log('\n═══════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════\n');

  console.log('✅ Free User:');
  console.log('   - Downloads 1-5: Should work');
  console.log('   - Download 6: Should be blocked');
  console.log('   - Shows "X/5 downloads remaining"\n');

  console.log('✅ Premium User (after code):');
  console.log('   - Unlimited downloads');
  console.log('   - No quota limit');
  console.log('   - Premium active for duration_months\n');

  console.log('📱 Test in App:');
  console.log('   1. Admin: http://127.0.0.1:3001/subscription-codes');
  console.log('   2. App: http://127.0.0.1:5176/');
  console.log('   3. Settings → Premium → Redeem Code');
  console.log('   4. Try downloading papers/books\n');
}

runTests().then(() => {
  console.log('✅ All tests complete!\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
