/**
 * Quick diagnostic script to test Supabase papers query
 * Run with: node test-supabase-papers.js
 */

import { createClient } from '@supabase/supabase-js';

// Read from .env or environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xrbuztplakbhkqupbhcc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYnV6dHBsYWtiaGtxdXBiaGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Nzk4MjMsImV4cCI6MjA1MTA1NTgyM30.JhQmj8x6K7U1Zr5spMM8VxpBCWGS4c4d_LHxHRVJVsw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPapersQuery() {
  console.log('🔍 Testing Supabase papers query...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Using anon key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

  try {
    // Test 1: Count papers
    const { count, error: countError } = await supabase
      .from('exam_papers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Count query failed:', countError);
    } else {
      console.log(`✅ Total papers in database: ${count}\n`);
    }

    // Test 2: Fetch all papers
    const { data, error } = await supabase
      .from('exam_papers')
      .select('*')
      .order('year', { ascending: false });

    if (error) {
      console.error('❌ Fetch error:', error);
      return;
    }

    console.log(`✅ Query returned ${data?.length || 0} papers\n`);

    if (data && data.length > 0) {
      console.log('📊 Papers breakdown by class level:');
      const byClass = {};
      data.forEach(p => {
        byClass[p.class_level] = (byClass[p.class_level] || 0) + 1;
      });
      Object.entries(byClass).forEach(([level, count]) => {
        console.log(`  - ${level}: ${count} papers`);
      });

      console.log('\n📄 First 3 papers:');
      data.slice(0, 3).forEach(p => {
        console.log(`  - ${p.title} (${p.class_level}, ${p.year})`);
      });
    } else {
      console.warn('⚠️ No papers returned from query');
    }

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testPapersQuery();
