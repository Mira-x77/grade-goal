// Fix quota count for existing downloads
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixQuotaCount() {
  console.log('🔧 Fixing quota count for existing downloads...\n');

  // Get all quota records
  const { data: quotas, error: quotaError } = await supabase
    .from('user_download_quotas')
    .select('*')
    .order('updated_at', { ascending: false });

  if (quotaError) {
    console.error('❌ Error fetching quotas:', quotaError.message);
    return;
  }

  console.log(`📊 Found ${quotas?.length || 0} quota records:\n`);
  
  if (quotas && quotas.length > 0) {
    quotas.forEach((quota, index) => {
      console.log(`${index + 1}. Device: ${quota.device_id.substring(0, 20)}...`);
      console.log(`   Downloads: ${quota.downloads_used}/${quota.quota_limit}`);
      console.log(`   Month: ${quota.month_year}`);
      console.log(`   Premium: ${quota.is_premium}`);
      console.log('');
    });

    // Update the most recent quota to reflect 3 downloads
    const latestQuota = quotas[0];
    console.log(`🔄 Updating quota for device: ${latestQuota.device_id.substring(0, 20)}...`);
    console.log(`   Current: ${latestQuota.downloads_used}/5`);
    console.log(`   Setting to: 3/5\n`);

    const { data: updated, error: updateError } = await supabase
      .from('user_download_quotas')
      .update({ 
        downloads_used: 3,
        updated_at: new Date().toISOString()
      })
      .eq('id', latestQuota.id)
      .select();

    if (updateError) {
      console.error('❌ Error updating quota:', updateError.message);
    } else {
      console.log('✅ Quota updated successfully!');
      console.log('   New count: 3/5');
      console.log('   Remaining: 2 downloads');
    }
  } else {
    console.log('⚠️  No quota records found.');
    console.log('   This is normal if you haven\'t downloaded anything yet.');
    console.log('   The quota will be created on your first download.');
  }

  // Verify the update
  console.log('\n🧪 Verifying quota status...');
  
  if (quotas && quotas.length > 0) {
    const { data: status, error: statusError } = await supabase.rpc('get_download_quota_status', {
      p_device_id: quotas[0].device_id
    });

    if (statusError) {
      console.error('❌ Error checking status:', statusError.message);
    } else {
      console.log('✅ Current status:');
      console.log(`   Downloads used: ${status[0].downloads_used}`);
      console.log(`   Quota limit: ${status[0].quota_limit}`);
      console.log(`   Remaining: ${status[0].downloads_remaining}`);
      console.log(`   Can download: ${status[0].can_download}`);
    }
  }
}

fixQuotaCount();
