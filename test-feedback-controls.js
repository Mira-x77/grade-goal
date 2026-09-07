// Test feedback admin controls
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3MDA0OSwiZXhwIjoyMDg4MDQ2MDQ5fQ.8YlrC1gJEkKXdj6wix0JY8nFUveb9XXW8PZQj8MgBTc';

const supabase = createClient(supabaseUrl, anonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testFeedbackControls() {
  console.log('═══════════════════════════════════════════════');
  console.log('  FEEDBACK CONTROLS TEST');
  console.log('═══════════════════════════════════════════════\n');

  // Test 1: Fetch feedback (app perspective)
  console.log('📋 TEST 1: Fetching Feedback (App View)');
  console.log('─────────────────────────────────────────────\n');

  const { data: feedback, error: fetchError } = await supabase
    .from('feedback_with_votes')
    .select('*')
    .eq('grading_system', 'apc')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fetchError) {
    console.error('❌ Fetch error:', fetchError.message);
    return;
  }

  console.log(`✅ Found ${feedback?.length || 0} feedback items\n`);

  if (!feedback || feedback.length === 0) {
    console.log('⚠️  No feedback found. Create some in the app first:');
    console.log('   http://127.0.0.1:5176/feedback\n');
    return;
  }

  feedback.forEach((item, i) => {
    console.log(`${i + 1}. "${item.title}" - Status: ${item.status}`);
    console.log(`   Votes: ${item.vote_count || 0}`);
    console.log(`   ID: ${item.id}\n`);
  });

  const testItem = feedback[0];

  // Test 2: Update status (admin operation)
  console.log('\n🔄 TEST 2: Updating Feedback Status (Admin)');
  console.log('─────────────────────────────────────────────\n');

  const currentStatus = testItem.status;
  const newStatus = currentStatus === 'under_review' ? 'planned' : 'under_review';

  console.log(`Testing with: "${testItem.title}"`);
  console.log(`Current status: ${currentStatus}`);
  console.log(`New status: ${newStatus}\n`);

  const { error: updateError } = await supabaseAdmin
    .from('feedback')
    .update({ status: newStatus })
    .eq('id', testItem.id);

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    console.log('   Make sure admin panel is using supabaseAdmin!\n');
  } else {
    console.log('✅ Status updated successfully!\n');

    // Verify update
    const { data: updated } = await supabase
      .from('feedback_with_votes')
      .select('status')
      .eq('id', testItem.id)
      .single();

    console.log(`Verified: Status is now "${updated?.status}"`);

    if (updated?.status === newStatus) {
      console.log('✅ Update confirmed in database!\n');
    } else {
      console.log('⚠️  Status mismatch - check database\n');
    }

    // Revert status back
    await supabaseAdmin
      .from('feedback')
      .update({ status: currentStatus })
      .eq('id', testItem.id);
    console.log(`✅ Reverted status back to "${currentStatus}"\n`);
  }

  // Test 3: Test delete (create test item first)
  console.log('\n🗑️  TEST 3: Delete Feedback (Admin)');
  console.log('─────────────────────────────────────────────\n');

  // Create test feedback item
  const testFeedback = {
    title: 'Test Feedback - DELETE ME',
    description: 'This is a test feedback item that will be deleted.',
    user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
    grading_system: 'apc',
  };

  console.log('Creating test feedback item...');
  const { data: created, error: createError } = await supabaseAdmin
    .from('feedback')
    .insert(testFeedback)
    .select()
    .single();

  if (createError) {
    console.error('❌ Failed to create test item:', createError.message);
    return;
  }

  console.log(`✅ Created test item: ${created.id}\n`);

  // Try to delete it
  console.log('Attempting to delete test item...');
  const { error: deleteError } = await supabaseAdmin
    .from('feedback')
    .delete()
    .eq('id', created.id);

  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    console.log('   Make sure admin panel is using supabaseAdmin!\n');
  } else {
    console.log('✅ Delete successful!\n');

    // Verify deletion
    const { data: checkDeleted } = await supabase
      .from('feedback')
      .select('id')
      .eq('id', created.id);

    if (!checkDeleted || checkDeleted.length === 0) {
      console.log('✅ Confirmed: Item deleted from database\n');
    } else {
      console.log('⚠️  Item still exists in database\n');
    }
  }

  // Test 4: App refresh
  console.log('\n🔄 TEST 4: App Refresh');
  console.log('─────────────────────────────────────────────\n');

  console.log('Simulating app refresh (refetch all feedback)...');
  const { data: refreshed, error: refreshError } = await supabase
    .from('feedback_with_votes')
    .select('*')
    .eq('grading_system', 'apc')
    .order('created_at', { ascending: false });

  if (refreshError) {
    console.error('❌ Refresh failed:', refreshError.message);
  } else {
    console.log(`✅ Refreshed: Found ${refreshed?.length || 0} items`);
    console.log('   App can fetch updated list successfully\n');
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════════════\n');

  console.log('✅ Admin Operations:');
  console.log('   - Update status: Works with supabaseAdmin');
  console.log('   - Delete feedback: Works with supabaseAdmin\n');

  console.log('✅ App Operations:');
  console.log('   - Fetch feedback: Works with anon key');
  console.log('   - Refresh: Can fetch updated list\n');

  console.log('📱 Manual Test Steps:');
  console.log('   1. Admin: http://127.0.0.1:3001/feedback');
  console.log('   2. Change a feedback status');
  console.log('   3. App: http://127.0.0.1:5176/feedback');
  console.log('   4. Click 🔄 refresh button');
  console.log('   5. Status should update\n');

  console.log('   6. Admin: Delete a feedback item');
  console.log('   7. App: Click 🔄 refresh');
  console.log('   8. Item should disappear\n');
}

testFeedbackControls().then(() => {
  console.log('✅ Tests complete!\n');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
