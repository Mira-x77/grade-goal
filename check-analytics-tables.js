// Check what analytics/tracking tables exist
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, anonKey);

async function checkAnalytics() {
  console.log('🔍 Checking Analytics/Tracking System\n');
  console.log('═══════════════════════════════════════════════\n');

  // Check for common analytics table names
  const tablesToCheck = [
    'analytics',
    'app_analytics',
    'user_analytics',
    'session_tracking',
    'usage_tracking',
    'activity_log',
    'app_sessions',
    'user_activity',
    'page_views',
    'event_tracking'
  ];

  console.log('📊 Checking for analytics tables...\n');

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log(`✅ Found table: ${tableName}`);
        if (data && data.length > 0) {
          console.log('   Sample record:');
          console.log('   ' + JSON.stringify(data[0], null, 2).split('\n').join('\n   '));
        } else {
          console.log('   (empty table)');
        }
        console.log('');
      }
    } catch (err) {
      // Table doesn't exist, skip silently
    }
  }

  // Check download_tracking (we know this exists)
  console.log('📥 Checking download_tracking table...\n');
  const { data: downloads, error: downloadError } = await supabase
    .from('download_tracking')
    .select('*')
    .limit(3);

  if (downloadError) {
    console.log('❌ Error:', downloadError.message);
  } else {
    console.log(`✅ download_tracking exists (${downloads?.length || 0} sample records)`);
    if (downloads && downloads.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(downloads[0], null, 2));
    }
  }

  // Check course_views
  console.log('\n\n👀 Checking course_views table...\n');
  const { data: courseViews, error: viewsError } = await supabase
    .from('course_views')
    .select('*')
    .limit(3);

  if (viewsError) {
    console.log('❌ Error:', viewsError.message);
  } else {
    console.log(`✅ course_views exists (${courseViews?.length || 0} sample records)`);
    if (courseViews && courseViews.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(courseViews[0], null, 2));
    }
  }

  // Check notification_reads
  console.log('\n\n📧 Checking notification_reads table...\n');
  const { data: notifReads, error: notifError } = await supabase
    .from('notification_reads')
    .select('*')
    .limit(3);

  if (notifError) {
    console.log('❌ Error:', notifError.message);
  } else {
    console.log(`✅ notification_reads exists (${notifReads?.length || 0} sample records)`);
    if (notifReads && notifReads.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(notifReads[0], null, 2));
    }
  }

  // Check user_profile
  console.log('\n\n👤 Checking user_profile table...\n');
  const { data: profiles, error: profileError } = await supabase
    .from('user_profile')
    .select('*')
    .limit(3);

  if (profileError) {
    console.log('❌ Error:', profileError.message);
  } else {
    console.log(`✅ user_profile exists (${profiles?.length || 0} sample records)`);
    if (profiles && profiles.length > 0) {
      console.log('\nSample record (metadata hidden for privacy):');
      const sample = { ...profiles[0] };
      if (sample.metadata) sample.metadata = '[hidden]';
      console.log(JSON.stringify(sample, null, 2));
    }
  }

  // Summary
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('  ANALYTICS SUMMARY');
  console.log('═══════════════════════════════════════════════\n');

  console.log('📊 What We Track:');
  console.log('  ✅ Downloads (download_tracking)');
  console.log('  ✅ Course views (course_views)');
  console.log('  ✅ Notification reads (notification_reads)');
  console.log('  ✅ User profiles (user_profile)\n');

  console.log('❌ What We DON\'T Track:');
  console.log('  ❌ Session time / time spent in app');
  console.log('  ❌ Page views / screen navigation');
  console.log('  ❌ Button clicks / interactions');
  console.log('  ❌ App opens / launches');
  console.log('  ❌ Feature usage patterns\n');

  console.log('💡 Recommendation:');
  console.log('  Create app_sessions table to track:');
  console.log('  - Session start/end times');
  console.log('  - Time spent per day');
  console.log('  - Screens visited');
  console.log('  - Actions taken\n');
}

checkAnalytics().then(() => {
  console.log('✅ Check complete!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
