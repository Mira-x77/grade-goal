import { supabase } from './supabaseClient';

/**
 * Generate a single subscription code
 * Format: XXXX-XXXX-XXXX
 */
export function generateSubscriptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = 3;
  const segmentLength = 4;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => {
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
  }).join('-');
  
  return code;
}

/**
 * Check if code already exists in database
 */
async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('subscription_codes')
    .select('code')
    .eq('code', code)
    .single();
  
  return !error && !!data;
}

/**
 * Generate multiple unique codes
 */
export async function generateCodes(
  count: number,
  durationMonths: number
): Promise<string[]> {
  const codes: string[] = [];
  const maxAttempts = count * 10; // Prevent infinite loop
  let attempts = 0;
  
  while (codes.length < count && attempts < maxAttempts) {
    const code = generateSubscriptionCode();
    attempts++;
    
    // Check if code already exists
    const exists = await codeExists(code);
    
    if (!exists && !codes.includes(code)) {
      codes.push(code);
    }
  }
  
  if (codes.length < count) {
    throw new Error(`Could only generate ${codes.length} unique codes out of ${count} requested`);
  }
  
  return codes;
}

/**
 * Insert codes into database
 */
export async function insertCodes(
  codes: string[],
  durationMonths: number,
  createdBy: string
): Promise<void> {
  const { error } = await supabase
    .from('subscription_codes')
    .insert(
      codes.map(code => ({
        code,
        duration_months: durationMonths,
        created_by: createdBy
      }))
    );
  
  if (error) {
    console.error('Failed to insert codes:', error);
    throw new Error('Failed to save codes to database');
  }
  
  // Update analytics
  await supabase.rpc('update_code_generation_analytics', {
    p_count: codes.length,
    p_duration: durationMonths
  });
}

/**
 * Generate and insert codes in one operation
 */
export async function generateAndInsertCodes(
  count: number,
  durationMonths: number,
  createdBy: string
): Promise<string[]> {
  const codes = await generateCodes(count, durationMonths);
  await insertCodes(codes, durationMonths, createdBy);
  return codes;
}
