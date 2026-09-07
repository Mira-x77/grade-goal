// Fix quota count for ALL devices to reflect 3 downloads
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllQuotas() {
  console.log('🔧 Setting all quotas to 3/5 to match existing downloads...\n');

  // Update ALL quota records for current month
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  
  const { data: updated, error: updateError } = await supabase
    .from('user_download_quotas')
    .update({ 
      downloads_used: 3,
      updated_at: new Date().toISOString()
    })
    .eq('month_year', currentMonth)
    .select();

  if (updateError) {
    console.error('❌ Error updating quotas:', updateError.message);
    return;
  }

  console.log(`✅ Updated ${updated?.length || 0} quota records`);
  console.log('   All devices now show: 3/5 downloads\n');

  // Show all quotas
  const { data: quotas, error: quotaError } = await supabase
    .from('user_download_quotas')
    .select('*')
    .eq('month_year', currentMonth)
    .order('updated_at', { ascending: false });

  if (quotaError) {
    console.error('❌ Error fetching quotas:', quotaError.message);
    return;
  }

  console.log('📊 Current quota status:\n');
  quotas?.forEach((quota, index) => {
    console.log(`${index + 1}. Device: ${quota.device_id.substring(0, 30)}...`);
    console.log(`   Downloads: ${quota.downloads_used}/${quota.quota_limit}`);
    console.log(`   Remaining: ${quota.quota_limit - quota.downloads_used}`);
    console.log('');
  });

  console.log('✅ Done! The app should now show 3/5 downloads.');
  console.log('   Restart the app to see the updated count.');
}

fixAllQuotas();
