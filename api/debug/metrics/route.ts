import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anonKey);

  // ── 1. Total row count in daily_metrics ──────────────────────────────────
  const { count: totalMetricsCount, error: countError } = await client
    .from('daily_metrics')
    .select('*', { count: 'exact', head: true });

  // ── 2. Sample records (latest 5) ────────────────────────────────────────
  const { data: sampleRecords, error: sampleError } = await client
    .from('daily_metrics')
    .select('id, brand_id, metric_date, followers, reach, engagement, media_count')
    .order('metric_date', { ascending: false })
    .limit(5);

  // ── 3. Latest metric_date in the table ──────────────────────────────────
  const { data: latestDateRow, error: latestError } = await client
    .from('daily_metrics')
    .select('metric_date')
    .order('metric_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── 4. Earliest metric_date in the table ────────────────────────────────
  const { data: earliestDateRow } = await client
    .from('daily_metrics')
    .select('metric_date')
    .order('metric_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  // ── 5. Brands in the brands table ───────────────────────────────────────
  const { data: brands, error: brandsError } = await client
    .from('brands')
    .select('id, brand_name');

  // ── 6. Simulate the EXACT useMetrics query ────────────────────────────────
  // Using Last 30 Days filter (what the default date filter produces)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const simulatedStart = fmt(startDate);
  const simulatedEnd = fmt(today);

  const brandIds = brands?.map(b => b.id) || [];

  let simulatedQueryResult = null;
  let simulatedQueryError = null;
  let simulatedQueryCount = 0;

  if (brandIds.length > 0) {
    const { data, error, count } = await client
      .from('daily_metrics')
      .select(`
        brand_id,
        metric_date,
        followers,
        reach,
        engagement,
        media_count,
        brands ( brand_name )
      `, { count: 'exact' })
      .in('brand_id', brandIds)
      .gte('metric_date', simulatedStart)
      .lte('metric_date', simulatedEnd)
      .order('metric_date', { ascending: true });

    simulatedQueryResult = data;
    simulatedQueryError = error;
    simulatedQueryCount = count || 0;
  }

  // ── 7. Query WITHOUT date filter — to check if any data exists at all ─────
  const { count: noDateFilterCount } = await client
    .from('daily_metrics')
    .select('*', { count: 'exact', head: true })
    .in('brand_id', brandIds);

  return NextResponse.json({
    investigation: {
      step1_total_rows_daily_metrics: totalMetricsCount,
      step1_count_error: countError,

      step2_sample_records: sampleRecords,
      step2_sample_error: sampleError,

      step3_latest_metric_date: latestDateRow?.metric_date || null,
      step3_earliest_metric_date: earliestDateRow?.metric_date || null,
      step3_error: latestError,

      step4_brands_loaded: brands?.length || 0,
      step4_brands_error: brandsError,
      step4_brand_ids_used_in_query: brandIds,

      step5_simulated_date_filter: {
        start: simulatedStart,
        end: simulatedEnd,
        today_server_time: fmt(today),
      },

      step6_exact_query_result_count: simulatedQueryCount,
      step6_exact_query_error: simulatedQueryError,
      step6_exact_query_sample: simulatedQueryResult?.slice(0, 3) || [],

      step7_query_WITHOUT_date_filter_count: noDateFilterCount,

      diagnosis: {
        has_any_data: (totalMetricsCount || 0) > 0,
        data_in_last_30_days: simulatedQueryCount > 0,
        data_exists_but_outside_date_range:
          (totalMetricsCount || 0) > 0 && simulatedQueryCount === 0,
        table_is_completely_empty: totalMetricsCount === 0,
      }
    }
  });
}
