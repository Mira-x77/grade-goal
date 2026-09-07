/**
 * Direct database check - Run this to see what's actually in Supabase
 * node check-database-now.js
 */

import { createClient } from '@supabase/supabase-js';

// Check BOTH projects - one might have the data!
const PROJECTS = [
  {
    name: 'Current (.env)',
    url: 'https://aaayzhvqgqptgqaxxbdh.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3OiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
  },
  {
    name: 'Old Project (test file)',
    url: 'https://xrbuztplakbhkqupbhcc.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyYnV6dHBsYWtiaGtxdXBiaGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Nzk4MjMsImV4cCI6MjA1MTA1NTgyM30.JhQmj8x6K7U1Zr5spMM8VxpBCWGS4c4d_LHxHRVJVsw'
  }
];

async function checkProject(project) {
  const supabase = createClient(project.url, project.key);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 CHECKING: ${project.name}`);
  console.log(`URL: ${project.url}`);
  console.log('='.repeat(70));

  try {
    // Count total papers
    const { count, error: countError } = await supabase
      .from('exam_papers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ COUNT ERROR:', countError);
      console.error('This likely means:');
      console.error('  1. Table does not exist');
      console.error('  2. RLS policies are blocking access');
      console.error('  3. Wrong project/credentials\n');
      return;
    }

    console.log(`📊 TOTAL PAPERS IN DATABASE: ${count}\n`);

    if (count === 0) {
      console.error('❌ DATABASE IS EMPTY!');
      console.error('Migration 017_seed_exam_papers.sql has NOT been run yet.\n');
      console.error('TO FIX:');
      console.error('1. Go to: https://supabase.com/dashboard/project/aaayzhvqgqptgqaxxbdh/sql');
      console.error('2. Open file: supabase/migrations/017_seed_exam_papers.sql');
      console.error('3. Copy all content');
      console.error('4. Paste in SQL Editor and RUN\n');
      return;
    }

    // Fetch all papers
    const { data, error } = await supabase
      .from('exam_papers')
      .select('title, class_level, subject, year')
      .order('year', { ascending: false });

    if (error) {
      console.error('❌ FETCH ERROR:', error);
      return;
    }

    console.log(`✅ FETCHED ${data.length} PAPERS\n`);

    // Group by class level
    const byClass = {};
    data.forEach(p => {
      byClass[p.class_level] = (byClass[p.class_level] || 0) + 1;
    });

    console.log('📈 BREAKDOWN BY CLASS LEVEL:');
    Object.entries(byClass).sort((a, b) => b[1] - a[1]).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} papers`);
    });

    console.log('\n📄 FIRST 10 PAPERS:');
    data.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title}`);
      console.log(`     └─ ${p.class_level} | ${p.subject} | ${p.year}`);
    });

    console.log(`\n✅ DATABASE CHECK COMPLETE`);
    console.log(`Expected: 63 papers | Found: ${count} papers`);
    
    if (count < 63) {
      console.log(`\n⚠️  MISSING ${63 - count} PAPERS - Run migration 017!`);
    }

  } catch (err) {
    console.error('❌ EXCEPTION:', err.message);
  }
}

async function checkAllProjects() {
  console.log('🔍 CHECKING ALL SUPABASE PROJECTS...\n');
  
  for (const project of PROJECTS) {
    await checkProject(project);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ ALL CHECKS COMPLETE');
  console.log('='.repeat(70));
}

checkAllProjects();
