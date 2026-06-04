import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Test with the ANON KEY (exactly what the frontend uses)
  const anonClient = createClient(url, anonKey);

  // 1. Query brands with anon key
  const brandsResult = await anonClient
    .from('brands')
    .select('*', { count: 'exact' });

  // 2. Query daily_metrics with anon key
  const metricsResult = await anonClient
    .from('daily_metrics')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  // 3. Query pg_tables to check RLS status
  const rlsResult = await anonClient
    .rpc('get_rls_status');

  // 4. Check policies via information_schema (anon can read this)
  const policiesResult = await anonClient
    .from('pg_policies')
    .select('*')
    .in('tablename', ['brands', 'daily_metrics']);

  return NextResponse.json({
    supabase_url: url,
    anon_key_present: !!anonKey,
    anon_key_prefix: anonKey?.slice(0, 20) + '...',

    brands: {
      data: brandsResult.data,
      count: brandsResult.count,
      error: brandsResult.error,
      status: brandsResult.status,
    },

    daily_metrics: {
      data: metricsResult.data,
      count: metricsResult.count,
      error: metricsResult.error,
      status: metricsResult.status,
    },

    rls_check: {
      data: rlsResult.data,
      error: rlsResult.error,
    },

    policies: {
      data: policiesResult.data,
      error: policiesResult.error,
    },
  });
}
