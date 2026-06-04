import { supabase } from './supabase';

const API_VERSION = process.env.META_API_VERSION || 'v19.0';
const BASE = `https://graph.facebook.com/${API_VERSION}`;

// ─── helpers ────────────────────────────────────────────────────────────────

async function gql<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `HTTP ${res.status} — ${url}`);
  }
  return json as T;
}

// ─── Stage 1: Account snapshot ───────────────────────────────────────────────

async function fetchAccountSnapshot(igId: string, token: string) {
  const data = await gql<any>(
    `${BASE}/${igId}?fields=followers_count,media_count&access_token=${token}`
  );
  return {
    followers: data.followers_count ?? 0,
    media_count: data.media_count ?? 0,
  };
}

// ─── Stage 2: Account insights (reach + profile_views) ───────────────────────

async function fetchAccountInsights(igId: string, token: string) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 86400;

  const reachData = await gql<any>(
    `${BASE}/${igId}/insights?metric=reach&period=day&since=${start}&until=${end}&access_token=${token}`
  );
  const reachValues: { value: number; end_time: string }[] =
    reachData.data?.[0]?.values ?? [];
  const reach = reachValues.length > 0 ? reachValues[reachValues.length - 1].value : 0;

  let profileViews = 0;
  try {
    const pvData = await gql<any>(
      `${BASE}/${igId}/insights?metric=profile_views&period=day&since=${start}&until=${end}&access_token=${token}`
    );
    const pvValues: { value: number }[] = pvData.data?.[0]?.values ?? [];
    profileViews = pvValues.length > 0 ? pvValues[pvValues.length - 1].value : 0;
  } catch (_) { /* profile_views not critical */ }

  return { reach, profile_views: profileViews };
}

// ─── Stage 3: Media edge (last 25 posts) ─────────────────────────────────────

interface RawMedia {
  id: string;
  media_type: string;
  media_product_type?: string;
  caption?: string;
  media_url?: string;
  permalink?: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

async function fetchMediaEdge(igId: string, token: string, limit = 200): Promise<RawMedia[]> {
  const data = await gql<any>(
    `${BASE}/${igId}/media?fields=id,media_type,media_product_type,caption,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${token}`
  );
  return data.data ?? [];
}

// ─── Stage 4: Media insights per post ────────────────────────────────────────

async function fetchMediaInsights(
  mediaId: string,
  mediaType: string,
  mediaProductType: string | undefined,
  token: string
) {
  const isReel = mediaProductType === 'REELS';
  const isVideo = mediaType === 'VIDEO';

  let saved = 0, shares = 0, reach = 0, plays = 0;

  try {
    // Different media types support different metrics. 'plays' was deprecated in favor of 'views'
    let metrics = [];
    if (isReel) {
      metrics = ['reach', 'saved', 'shares', 'views'];
    } else if (isVideo) {
      metrics = ['reach', 'saved', 'views'];
    } else {
      // Images / Carousels
      metrics = ['reach', 'saved'];
    }

    const data = await gql<any>(
      `${BASE}/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${token}`
    );
    for (const item of data.data ?? []) {
      const v = item.values?.[0]?.value ?? item.value ?? 0;
      if (item.name === 'saved') saved = v;
      if (item.name === 'shares') shares = v;
      if (item.name === 'reach') reach = v;
      if (item.name === 'plays' || item.name === 'video_views' || item.name === 'views') plays = v;
    }
  } catch (err: any) {
    console.warn(`[meta-service] Media insights fetch failed for ${mediaId} (${mediaProductType || mediaType}): ${err.message}`);
  }

  return { saved, shares, reach, plays };
}

// ─── Stage 5: Audience Demographics (Mock/Pipeline) ──────────────────────────

async function fetchAudienceDemographics(igId: string, token: string) {
  let gender_age = {};
  let cities = {};
  let countries = {};

  try {
    const data = await gql<any>(
      `${BASE}/${igId}/insights?metric=audience_city,audience_country,audience_gender_age&period=lifetime&access_token=${token}`
    );
    
    for (const item of data.data ?? []) {
      const val = item.values?.[0]?.value ?? {};
      if (item.name === 'audience_gender_age') gender_age = val;
      if (item.name === 'audience_city') cities = val;
      if (item.name === 'audience_country') countries = val;
    }
  } catch (err: any) {
    // Advanced Access required for demographics
    console.warn(`[meta-service] Demographics fetch failed (expected without Advanced Access): ${err.message}`);
  }

  return { gender_age, cities, countries };
}


// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function syncBrandMetrics(brandId?: string) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('Missing META_ACCESS_TOKEN');

  let query = supabase
    .from('brands')
    .select('id, brand_name, instagram_business_id')
    .not('instagram_business_id', 'is', null);

  if (brandId) query = query.eq('id', brandId);

  const { data: brands, error: brandsErr } = await query;

  if (brandsErr) throw new Error(`Brands query failed: ${brandsErr.message}`);
  if (!brands?.length) {
    return { synced: 0, message: 'No brands with instagram_business_id', results: [] };
  }

  const today = new Date().toISOString().split('T')[0];
  const results: any[] = [];

  for (const brand of brands) {
    const igId = brand.instagram_business_id;
    const brandResult: any = { brand_name: brand.brand_name, stages: {} };

    try {
      // ── Stage 1: Account snapshot ─────────────────────────────────────
      const snapshot = await fetchAccountSnapshot(igId, token);
      brandResult.stages.snapshot = { status: 'ok', data: snapshot };

      // ── Stage 2: Account insights ─────────────────────────────────────
      const insights = await fetchAccountInsights(igId, token);
      brandResult.stages.insights = { status: 'ok', data: insights };

      // ── Stage 3: Media edge ───────────────────────────────────────────
      const media = await fetchMediaEdge(igId, token);
      brandResult.stages.media_edge = { status: 'ok', count: media.length };

      // ── Stage 4: Per-post insights + upsert to media_metrics ─────────
      let totalLikes = 0, totalComments = 0, totalSaved = 0;
      let totalShares = 0, totalPlays = 0;
      let postsPublished = 0, reelsPublished = 0, carouselPosts = 0;

      // Collect per-post engagement rates for correct ER formula
      const perPostEngagementRates: number[] = [];

      for (const post of media) {
        const { saved, shares, reach: postReach, plays } = await fetchMediaInsights(
          post.id, post.media_type, post.media_product_type, token
        );

        const postInteractions =
          (post.like_count || 0) + (post.comments_count || 0) + saved + shares;

        // Per-post ER = interactions / post_reach (only count posts with measurable reach)
        if (postReach > 0) {
          perPostEngagementRates.push((postInteractions / postReach) * 100);
        }

        // Upsert into media_metrics
        await supabase.from('media_metrics').upsert({
          brand_id: brand.id,
          media_id: post.id,
          media_type: post.media_type,
          media_product_type: post.media_product_type ?? null,
          caption: post.caption?.slice(0, 500) ?? null,
          media_url: post.media_url ?? null,
          permalink: post.permalink ?? null,
          posted_at: post.timestamp,
          like_count: post.like_count || 0,
          comments_count: post.comments_count || 0,
          reach: postReach,
          saved,
          shares,
          plays,
          video_views: 0,
          total_interactions: postInteractions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'brand_id,media_id' });

        // Accumulate totals
        totalLikes += post.like_count || 0;
        totalComments += post.comments_count || 0;
        totalSaved += saved;
        totalShares += shares;
        totalPlays += plays;
        if (post.media_product_type === 'REELS') reelsPublished++;
        else if (post.media_type === 'CAROUSEL_ALBUM') carouselPosts++;
        else postsPublished++;
      }

      brandResult.stages.media_metrics_upserted = media.length;

      // ── Stage 5: KPI calculations ─────────────────────────────────────
      const totalEngagement = totalLikes + totalComments + totalSaved + totalShares;

      /**
       * ENGAGEMENT RATE (Industry Standard — reach-based)
       * Formula: AVG( post_interactions / post_reach ) across all posts where post_reach > 0
       * Both numerator and denominator are per-post values — commensurable time periods.
       * Reference: Hootsuite / Sprout Social standard definition.
       */
      const engagementRate = perPostEngagementRates.length > 0
        ? parseFloat(
            (perPostEngagementRates.reduce((a, b) => a + b, 0) / perPostEngagementRates.length)
            .toFixed(4)
          )
        : 0;

      /**
       * ACTIVATION RATE
       * Formula: ( daily_account_reach / followers ) * 100
       * Measures what % of total audience was reached today.
       * Both values are account-level, same day — commensurable.
       */
      const activationRate = snapshot.followers > 0
        ? parseFloat(((insights.reach / snapshot.followers) * 100).toFixed(4))
        : 0;

      const payload = {
        brand_id: brand.id,
        metric_date: today,
        followers: snapshot.followers,
        media_count: snapshot.media_count,
        reach: insights.reach,
        profile_views: insights.profile_views,
        likes: totalLikes,
        comments: totalComments,
        saves: totalSaved,
        shares: totalShares,
        video_views: 0,
        reels_plays: totalPlays,
        posts_published: postsPublished,
        reels_published: reelsPublished,
        carousel_posts: carouselPosts,
        engagement_rate: engagementRate,    // AVG per-post ER (reach-based)
        activation_rate: activationRate,     // daily_reach / followers
        engagement: totalEngagement,         // raw interaction sum (legacy compat)
      };

      const { error: upsertErr } = await supabase
        .from('daily_metrics')
        .upsert(payload, { onConflict: 'brand_id,metric_date' });

      if (upsertErr) throw new Error(`daily_metrics upsert: ${upsertErr.message}`);

      brandResult.stages.daily_metrics = {
        status: 'ok',
        kpis: {
          engagement_rate_pct: engagementRate,
          activation_rate_pct: activationRate,
          total_interactions: totalEngagement,
          posts_used_for_er: perPostEngagementRates.length,
          reach: insights.reach,
          followers: snapshot.followers,
        }
      };
      
      // ── Stage 6: Audience Demographics ────────────────────────────────
      const demographics = await fetchAudienceDemographics(igId, token);
      const { error: demoErr } = await supabase
        .from('audience_demographics')
        .upsert({
          brand_id: brand.id,
          metric_date: today,
          gender_age: demographics.gender_age,
          cities: demographics.cities,
          countries: demographics.countries,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'brand_id,metric_date' });
        
      if (demoErr) console.warn(`Demographics upsert failed: ${demoErr.message}`);

      brandResult.status = 'success';

    } catch (e: any) {
      brandResult.status = 'error';
      brandResult.error = e.message;
    }

    results.push(brandResult);
  }

  return { synced: brands.length, date: today, results };
}

// ─── Historical Backfill ──────────────────────────────────────────────────────

export async function backfillBrandMetrics(brandId?: string, days = 30) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error('Missing META_ACCESS_TOKEN');

  let query = supabase
    .from('brands')
    .select('id, brand_name, instagram_business_id')
    .not('instagram_business_id', 'is', null);

  if (brandId) query = query.eq('id', brandId);

  const { data: brands, error: brandsErr } = await query;
  if (brandsErr || !brands?.length) return { error: 'No brands found' };

  const end = Math.floor(Date.now() / 1000);
  const start = end - (days * 86400);

  const results = [];

  for (const brand of brands) {
    const igId = brand.instagram_business_id;
    try {
      // We can fetch up to 30 days of reach and impressions using period=day
      const reachData = await gql<any>(
        `${BASE}/${igId}/insights?metric=reach,impressions,profile_views&period=day&since=${start}&until=${end}&access_token=${token}`
      ).catch(() => ({ data: [] }));

      let reachValues: any[] = [];
      let pvValues: any[] = [];
      let impValues: any[] = [];

      for (const item of reachData.data ?? []) {
        if (item.name === 'reach') reachValues = item.values ?? [];
        if (item.name === 'profile_views') pvValues = item.values ?? [];
        if (item.name === 'impressions') impValues = item.values ?? [];
      }

      // We need to upsert historical reach into daily_metrics
      // The Meta API returns end_time like "2026-06-03T07:00:00+0000"
      for (const rv of reachValues) {
        if (!rv.end_time || rv.value === undefined) continue;
        
        // Convert end_time to YYYY-MM-DD
        const dateObj = new Date(rv.end_time);
        // Meta's end_time is usually the morning of the *next* day for the previous day's data
        // We'll just take the date string directly or subtract 1 day. Let's subtract 12 hours to be safe.
        dateObj.setHours(dateObj.getHours() - 12);
        const metricDate = dateObj.toISOString().split('T')[0];
        
        // Find matching profile views
        const matchingPv = pvValues.find(p => p.end_time === rv.end_time);
        const matchingImp = impValues.find(p => p.end_time === rv.end_time);
        
        // We do a partial update using upsert. 
        // We don't want to overwrite followers/engagement if they exist, but if this is a new row, it will have 0s.
        await supabase
          .from('daily_metrics')
          .upsert({
            brand_id: brand.id,
            metric_date: metricDate,
            reach: rv.value,
            profile_views: matchingPv ? matchingPv.value : 0,
            engagement: matchingImp ? matchingImp.value : 0, // Temporarily map impressions to engagement if needed, or simply don't overwrite if not available. Wait, no. We just omit them if we don't have them, or initialize to 0.
          }, { onConflict: 'brand_id,metric_date', ignoreDuplicates: false });
      }
      
      results.push({ brand: brand.brand_name, days_backfilled: reachValues.length });
    } catch (e: any) {
      results.push({ brand: brand.brand_name, error: e.message });
    }
  }

  return { success: true, results };
}
