import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const report: any = {};

  // 1. daily_metrics row count
  const { count: dmCount } = await client
    .from('daily_metrics')
    .select('*', { count: 'exact', head: true });
  report.daily_metrics_total_rows = dmCount;

  // 2. Sample 5 rows from daily_metrics
  const { data: dmSample } = await client
    .from('daily_metrics')
    .select('brand_id, metric_date, followers, reach, profile_views, likes, comments, saves, shares, engagement_rate, activation_rate')
    .order('metric_date', { ascending: false })
    .limit(5);
  report.daily_metrics_sample = dmSample;

  // 3. Non-zero engagement check
  const { count: nonZeroEngagement } = await client
    .from('daily_metrics')
    .select('*', { count: 'exact', head: true })
    .gt('likes', 0);
  report.daily_metrics_rows_with_likes = nonZeroEngagement;

  // 4. Non-zero profile_views check
  const { count: nonZeroPV } = await client
    .from('daily_metrics')
    .select('*', { count: 'exact', head: true })
    .gt('profile_views', 0);
  report.daily_metrics_rows_with_profile_views = nonZeroPV;

  // 5. media_metrics row count
  const { count: mmCount } = await client
    .from('media_metrics')
    .select('*', { count: 'exact', head: true });
  report.media_metrics_total_rows = mmCount;

  // 6. Sample top 5 posts by total_interactions
  const { data: topPosts } = await client
    .from('media_metrics')
    .select('brand_id, media_id, media_type, media_product_type, like_count, comments_count, saves, shares, total_interactions, posted_at')
    .order('total_interactions', { ascending: false })
    .limit(5);
  report.media_metrics_top_5_posts = topPosts;

  // 7. media_metrics breakdown by media_type
  const { data: allMedia } = await client
    .from('media_metrics')
    .select('media_type, media_product_type');

  if (allMedia) {
    const breakdown: Record<string, number> = {};
    for (const row of allMedia) {
      const key = `${row.media_product_type ?? row.media_type}`;
      breakdown[key] = (breakdown[key] || 0) + 1;
    }
    report.media_metrics_breakdown_by_type = breakdown;
  }

  // 8. Brand coverage check
  const { data: brandCoverage } = await client
    .from('daily_metrics')
    .select('brand_id')
    .order('brand_id');
  const uniqueBrands = new Set(brandCoverage?.map(r => r.brand_id));
  report.brands_with_daily_metrics = uniqueBrands.size;

  const { data: mediaBrandCoverage } = await client
    .from('media_metrics')
    .select('brand_id')
    .order('brand_id');
  const uniqueMediaBrands = new Set(mediaBrandCoverage?.map(r => r.brand_id));
  report.brands_with_media_metrics = uniqueMediaBrands.size;

  // 9. Overall verdict
  report.validation_passed = (
    (dmCount ?? 0) > 0 &&
    (mmCount ?? 0) > 0 &&
    (nonZeroEngagement ?? 0) > 0
  );

  return NextResponse.json(report, { status: 200 });
}
