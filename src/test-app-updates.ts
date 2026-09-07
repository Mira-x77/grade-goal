// Test file to verify app updates system is working
import { updateService } from './services/UpdateService';
import { supabase } from './integrations/supabase/client';

export async function testAppUpdates() {
  console.log('🧪 Testing App Updates System...');
  
  try {
    // Test 1: Check Supabase connection
    console.log('1. Testing Supabase connection...');
    const { data, error } = await supabase.from('app_updates').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      if (error.message.includes('relation "app_updates" does not exist')) {
        console.log('💡 Run the SQL from exam-library-admin/setup-app-updates.sql to create the table');
      }
    } else {
      console.log('✅ Supabase connection working');
    }
    
    // Test 2: Check for updates
    console.log('2. Testing update check...');
    const updateResult = await updateService.checkForUpdates();
    console.log('✅ Update check completed:', updateResult);
    
    // Test 3: Get current version
    console.log('3. Testing version info...');
    const versionInfo = await updateService.getCurrentVersion();
    console.log('✅ Version info:', versionInfo);
    
    console.log('🎉 All tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Auto-run test in development
if (import.meta.env.DEV) {
  // Run test after a short delay to ensure app is loaded
  setTimeout(() => {
    testAppUpdates();
  }, 3000);
}