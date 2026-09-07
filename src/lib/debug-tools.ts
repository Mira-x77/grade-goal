/**
 * Debug and diagnostic tools for troubleshooting the GoStudy app
 * Use these functions in browser console to investigate issues
 */

import { cacheService } from '@/services/cacheService';
import { examService } from '@/services/examService';
import { supabase } from '@/integrations/supabase/client';

export const debugTools = {
  /**
   * Clear all app caches and force fresh data
   */
  async clearAllCaches() {
    console.log('🗑️ Clearing all caches...');
    try {
      // Clear IndexedDB caches
      await cacheService.clearAll();
      console.log('✅ IndexedDB caches cleared');
      
      // Clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (!key.includes('supabase') && !key.includes('auth')) {
          localStorage.removeItem(key);
          console.log(`  Removed: ${key}`);
        }
      });
      console.log('✅ LocalStorage cleared (except auth)');
      
      console.log('✨ All caches cleared! Reload the page to fetch fresh data.');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear caches:', error);
      return false;
    }
  },

  /**
   * Test Supabase connection and paper retrieval
   */
  async testPaperFetch() {
    console.log('🧪 Testing paper fetch from Supabase...\n');
    
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*', { count: 'exact' });
      
      if (error) {
        console.error('❌ Supabase error:', error);
        return { success: false, error };
      }
      
      console.log('✅ Supabase connection: SUCCESS');
      console.log(`📊 Papers in database: ${data?.length ?? 0}`);
      
      if (data && data.length > 0) {
        console.log('\n📋 First 3 papers:');
        data.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.title} (${p.class_level}, ${p.subject}, ${p.year})`);
        });
        
        // Group by class
        const byClass: Record<string, number> = {};
        data.forEach(p => {
          byClass[p.class_level] = (byClass[p.class_level] || 0) + 1;
        });
        console.log('\n📐 Papers by class level:');
        Object.entries(byClass).forEach(([cls, count]) => {
          console.log(`  ${cls}: ${count}`);
        });
      }
      
      return { success: true, count: data?.length ?? 0, data };
    } catch (error) {
      console.error('❌ Exception:', error);
      return { success: false, error };
    }
  },

  /**
   * Check what the examService returns
   */
  async testExamService() {
    console.log('🧪 Testing examService.fetchPapers()...\n');
    
    try {
      const papers = await examService.fetchPapers();
      console.log(`✅ examService returned ${papers.length} papers`);
      
      if (papers.length === 8) {
        console.warn('⚠️ WARNING: Returned 8 papers = SAMPLE_PAPERS fallback!');
        console.warn('   This means the real data fetch failed somehow.');
      } else {
        console.log('✅ Correct! Using real Supabase data.');
      }
      
      console.log('\n📋 First 3 papers:');
      papers.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.title} (${p.classLevel}, ${p.subject})`);
      });
      
      return { success: true, count: papers.length, papers: papers.slice(0, 5) };
    } catch (error) {
      console.error('❌ examService failed:', error);
      return { success: false, error };
    }
  },

  /**
   * Check cache status
   */
  async inspectCache() {
    console.log('🔍 Inspecting IndexedDB cache...\n');
    
    try {
      const cachedPapers = await cacheService.getCachedPapers();
      console.log(`📦 Cached papers: ${cachedPapers.length}`);
      
      const downloaded = cachedPapers.filter(p => p.isDownloaded);
      console.log(`  Downloaded: ${downloaded.length}`);
      console.log(`  Not downloaded: ${cachedPapers.length - downloaded.length}`);
      
      if (downloaded.length > 0) {
        console.log('\n📥 Downloaded papers:');
        downloaded.forEach(p => {
          console.log(`  - ${p.title} → ${p.localPath}`);
        });
      }
      
      const filterState = await cacheService.getFilterState();
      console.log('\n🔧 Saved filter state:', filterState ?? 'none');
      
      return { cachedPapers: cachedPapers.length, downloaded: downloaded.length, filters: filterState };
    } catch (error) {
      console.error('❌ Cache inspection failed:', error);
      return { success: false, error };
    }
  },

  /**
   * Full diagnostic report
   */
  async fullDiagnostic() {
    console.log('🔬 === FULL DIAGNOSTIC REPORT ===\n');
    
    console.log('1️⃣ Testing Supabase connection...');
    const supabaseTest = await this.testPaperFetch();
    console.log('\n');
    
    console.log('2️⃣ Testing examService...');
    const serviceTest = await this.testExamService();
    console.log('\n');
    
    console.log('3️⃣ Inspecting cache...');
    const cacheInspect = await this.inspectCache();
    console.log('\n');
    
    console.log('📊 === DIAGNOSTIC SUMMARY ===');
    console.log(`  Supabase papers: ${supabaseTest.success ? supabaseTest.count : 'ERROR'}`);
    console.log(`  examService papers: ${serviceTest.success ? serviceTest.count : 'ERROR'}`);
    console.log(`  Cached papers: ${typeof cacheInspect.cachedPapers === 'number' ? cacheInspect.cachedPapers : 'ERROR'}`);
    
    if (serviceTest.count === 8) {
      console.warn('\n⚠️ ISSUE DETECTED:');
      console.warn('  examService is returning SAMPLE_PAPERS (8 papers) instead of real data');
      console.warn('  Recommendation: Clear caches and reload');
      console.warn('  Run: debugTools.clearAllCaches()');
    } else if (supabaseTest.count !== serviceTest.count) {
      console.warn('\n⚠️ MISMATCH DETECTED:');
      console.warn(`  Supabase has ${supabaseTest.count} papers but examService returns ${serviceTest.count}`);
    } else {
      console.log('\n✅ ALL SYSTEMS WORKING CORRECTLY');
    }
    
    return {
      supabase: supabaseTest,
      examService: serviceTest,
      cache: cacheInspect
    };
  }
};

// Make it available globally for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugTools = debugTools;
  console.log('🛠️ Debug tools loaded! Use window.debugTools in console');
  console.log('  debugTools.fullDiagnostic() - Run full diagnostic');
  console.log('  debugTools.clearAllCaches() - Clear all caches');
  console.log('  debugTools.testPaperFetch() - Test Supabase connection');
  console.log('  debugTools.testExamService() - Test examService');
  console.log('  debugTools.inspectCache() - Inspect cache status');
}
