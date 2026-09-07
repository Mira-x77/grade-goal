// Verify downloads column migration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔍 Verifying downloads column...\n');

  // Check exam_papers
  const { data: papers, error: papersError } = await supabase
    .from('exam_papers')
    .select('id, title, downloads')
    .limit(5);

  if (papersError) {
    console.error('❌ Error fetching exam_papers:', papersError.message);
  } else {
    console.log('✅ exam_papers table:');
    console.table(papers.map(p => ({
      id: p.id.substring(0, 8) + '...',
      title: p.title.substring(0, 40),
      downloads: p.downloads
    })));
  }

  // Check library_books
  const { data: books, error: booksError } = await supabase
    .from('library_books')
    .select('id, title, downloads')
    .limit(5);

  if (booksError) {
    console.error('❌ Error fetching library_books:', booksError.message);
  } else {
    console.log('\n✅ library_books table:');
    console.table(books.map(b => ({
      id: b.id.substring(0, 8) + '...',
      title: b.title.substring(0, 40),
      downloads: b.downloads
    })));
  }

  // Check if increment function works
  console.log('\n🧪 Testing increment_download_with_quota function...');
  const { data: testResult, error: testError } = await supabase
    .rpc('increment_download_with_quota', {
      p_device_id: 'test-device-verification',
      p_paper_id: papers?.[0]?.id || null,
      p_book_id: null
    });

  if (testError) {
    console.error('❌ Function test failed:', testError.message);
  } else {
    console.log('✅ Function works!');
    console.log('Result:', testResult);
  }

  console.log('\n✅ Verification complete!');
}

verify();
