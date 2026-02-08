/**
 * Simple test endpoint
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    // Test env vars
    const envStatus = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    };

    // Test Supabase connection
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || ''
    );

    const { data, error } = await supabase.from('repositories').select('*').limit(1);

    res.status(200).json({
      success: true,
      envStatus,
      dbTest: error ? { error: error.message } : { rowCount: data?.length || 0, sample: data?.[0] },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
