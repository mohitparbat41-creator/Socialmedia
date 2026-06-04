import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const report: any = {};

  // Fetch all 9 brands' daily_metrics for today
  const { data: allMetrics } = await client
    .from('daily_metrics')
    .select(`
      metric_date,
      followers, reach, profile_views,
      likes, comments, saves, shares, video_views, reels_plays,
      posts_published, reels_published, carousel_posts, media_count,
      engagement_rate, activation_rate, engagement,
      brands ( brand_name )
    `)
    .order('metric_date', { ascending: false })
    .limit(18);

  report.daily_metrics_raw = allMetrics;

  // Fetch Get Set Learn media_metrics — count and sum
  const { data: gslBrand } = await client
    .from('brands')
    .select('id, brand_name')
    .eq('brand_name', 'Get Set Learn.Official')
    .single();

  if (gslBrand) {
    const { data: gslMedia, count: gslCount } = await client
      .from('media_metrics')
      .select('media_id, media_type, media_product_type, like_count, comments_count, saves, shares, reach, total_interactions, posted_at', { count: 'exact' })
      .eq('brand_id', gslBrand.id)
      .order('total_interactions', { ascending: false });

    report.gsl_media_count = gslCount;
    report.gsl_media_all = gslMedia;

    // Manual aggregation
    if (gslMedia) {
      const totalLikes = gslMedia.reduce((s, r) => s + (r.like_count || 0), 0);
      const totalComments = gslMedia.reduce((s, r) => s + (r.comments_count || 0), 0);
      const totalSaves = gslMedia.reduce((s, r) => s + (r.saves || 0), 0);
      const totalShares = gslMedia.reduce((s, r) => s + (r.shares || 0), 0);
      const totalInteractions = gslMedia.reduce((s, r) => s + (r.total_interactions || 0), 0);
      const totalMediaReach = gslMedia.reduce((s, r) => s + (r.reach || 0), 0);

      report.gsl_aggregated = {
        total_likes: totalLikes,
        total_comments: totalComments,
        total_saves: totalSaves,
        total_shares: totalShares,
        total_interactions: totalInteractions,
        total_media_reach: totalMediaReach,
        post_count: gslMedia.length,
      };
    }

    // Fetch daily reach for Get Set Learn
    const { data: gslDaily } = await client
      .from('daily_metrics')
      .select('metric_date, reach, followers, likes, comments, saves, shares, engagement_rate')
      .eq('brand_id', gslBrand.id)
      .order('metric_date', { ascending: false })
      .limit(1)
      .single();

    report.gsl_daily = gslDaily;

    // Show the exact formula that produced 524.6%
    if (gslDaily) {
      const totalEngagement = (gslDaily.likes || 0) + (gslDaily.comments || 0) + (gslDaily.saves || 0) + (gslDaily.shares || 0);
      const reach = gslDaily.reach || 0;
      report.gsl_formula_breakdown = {
        numerator: `likes(${gslDaily.likes}) + comments(${gslDaily.comments}) + saves(${gslDaily.saves}) + shares(${gslDaily.shares}) = ${totalEngagement}`,
        denominator: `daily reach = ${reach}`,
        result_pct: reach > 0 ? parseFloat(((totalEngagement / reach) * 100).toFixed(4)) : 'N/A (reach=0)',
        what_is_wrong: 'likes/comments/saves/shares are LIFETIME aggregates across all 25 posts. Reach is TODAY\'s single-day account reach. These are incommensurable time periods.',
      };
    }
  }

  return NextResponse.json(report, { status: 200 });
}
