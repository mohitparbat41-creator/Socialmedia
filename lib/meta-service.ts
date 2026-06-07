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

  // These v19+ metrics require metric_type=total_value (single aggregate).
  const tv = async (metric: string, extra = ''): Promise<any> => {
    try {
      const d = await gql<any>(
        `${BASE}/${igId}/insights?metric=${metric}&period=day&metric_type=total_value${extra}&since=${start}&until=${end}&access_token=${token}`
      );
      return d.data?.[0] ?? null;
    } catch (err: any) {
      console.warn(`[meta-service] ${metric} failed for ${igId}: ${err.message}`);
      return null;
    }
  };

  const [pv, viewsD, aeD, wcD, pltD] = await Promise.all([
    tv('profile_views'),
    tv('views'),
    tv('accounts_engaged'),
    tv('website_clicks'),
    tv('profile_links_taps', '&breakdown=contact_button_type'),
  ]);

  const clicks = { DIRECTION: 0, TEXT: 0, EMAIL: 0, CALL: 0 } as Record<string, number>;
  (pltD?.total_value?.breakdowns?.[0]?.results ?? []).forEach((r: any) => { clicks[r.dimension_values[0]] = r.value; });

  return {
    reach,
    profile_views: pv?.total_value?.value ?? 0,
    views: viewsD?.total_value?.value ?? 0,
    accounts_engaged: aeD?.total_value?.value ?? 0,
    website_clicks: wcD?.total_value?.value ?? 0,
    direction_clicks: clicks.DIRECTION,
    text_message_clicks: clicks.TEXT,
    email_clicks: clicks.EMAIL,
    call_clicks: clicks.CALL,
  };
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
  let watchTime = 0, avgWatchTime = 0, profileVisits = 0, follows = 0;

  try {
    // Different media types support different metrics. 'plays' deprecated → 'views'.
    let metrics: string[] = [];
    if (isReel) {
      metrics = ['reach', 'saved', 'shares', 'views', 'ig_reels_video_view_total_time', 'ig_reels_avg_watch_time'];
    } else if (isVideo) {
      metrics = ['reach', 'saved', 'views', 'profile_visits', 'follows'];
    } else {
      // Images / Carousels
      metrics = ['reach', 'saved', 'views', 'profile_visits', 'follows'];
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
      if (item.name === 'ig_reels_video_view_total_time') watchTime = v;
      if (item.name === 'ig_reels_avg_watch_time') avgWatchTime = v;
      if (item.name === 'profile_visits') profileVisits = v;
      if (item.name === 'follows') follows = v;
    }
  } catch (err: any) {
    console.warn(`[meta-service] Media insights fetch failed for ${mediaId} (${mediaProductType || mediaType}): ${err.message}`);
  }

  return { saved, shares, reach, plays, watchTime, avgWatchTime, profileVisits, follows, isReel };
}

// ─── Stage 5: Audience Demographics ──────────────────────────────────────────
// v19 deprecated audience_city/audience_country/audience_gender_age. The new
// metric is follower_demographics with metric_type=total_value and a single
// breakdown per request (age | gender | country | city).

async function fetchBreakdown(igId: string, token: string, breakdown: string): Promise<Record<string, number>> {
  try {
    const data = await gql<any>(
      `${BASE}/${igId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${breakdown}&access_token=${token}`
    );
    const results = data.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    const out: Record<string, number> = {};
    for (const r of results) {
      const key = (r.dimension_values || []).join(', ');
      out[key] = r.value ?? 0;
    }
    return out;
  } catch (err: any) {
    console.warn(`[meta-service] follower_demographics(${breakdown}) failed for ${igId}: ${err.message}`);
    return {};
  }
}

/** Hour-of-day audience activity (online_followers), converted to IST. */
async function fetchOnlineActivity(igId: string, token: string): Promise<Record<string, number>> {
  try {
    const end = Math.floor(Date.now() / 1000);
    const start = end - 86400 * 7;
    const data = await gql<any>(
      `${BASE}/${igId}/insights?metric=online_followers&period=lifetime&since=${start}&until=${end}&access_token=${token}`
    );
    const values = data.data?.[0]?.values ?? [];
    // Aggregate hourly counts across any returned days, shifting UTC hour → IST
    const istHours: Record<string, number> = {};
    let daysWithData = 0;
    for (const v of values) {
      const hourMap = v.value || {};
      if (Object.keys(hourMap).length === 0) continue;
      daysWithData++;
      for (const [hStr, count] of Object.entries(hourMap)) {
        const istHour = (parseInt(hStr) + 5) % 24; // +5h (ignore :30 for hour bucketing)
        istHours[istHour] = (istHours[istHour] || 0) + (count as number);
      }
    }
    if (daysWithData > 1) for (const k of Object.keys(istHours)) istHours[k] = Math.round(istHours[k] / daysWithData);
    return istHours;
  } catch (err: any) {
    console.warn(`[meta-service] online_followers failed for ${igId}: ${err.message}`);
    return {};
  }
}

async function fetchAudienceDemographics(igId: string, token: string) {
  let gender_age: any = {};
  let cities: Record<string, number> = {};
  let countries: Record<string, number> = {};

  try {
    const [age, gender, country, city, activity] = await Promise.all([
      fetchBreakdown(igId, token, 'age'),
      fetchBreakdown(igId, token, 'gender'),
      fetchBreakdown(igId, token, 'country'),
      fetchBreakdown(igId, token, 'city'),
      fetchOnlineActivity(igId, token),
    ]);
    // gender_age column (jsonb) holds the full demographics blob
    gender_age = { gender, age, activity };
    countries = country;
    cities = city;
    const total = Object.values(gender).reduce((a, b) => a + b, 0);
    console.log(`[meta-service] demographics for ${igId}: ${total} followers, ${Object.keys(city).length} cities, ${Object.keys(activity).length} active hours`);
  } catch (err: any) {
    console.warn(`[meta-service] Demographics fetch failed: ${err.message}`);
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
      // Per-publish-day engagement: interactions of posts PUBLISHED today (IST).
      // daily_metrics.engagement must be a daily FLOW value consistent with the
      // historical reconstruction — NOT the cumulative sum across all ~200 posts
      // (that cumulative write was the cause of the daily engagement "spike").
      let todayEngagement = 0, todayPosts = 0;
      const istToday = new Date(Date.now() + (5 * 60 + 30) * 60000).toISOString().split('T')[0];

      // Collect per-post engagement rates for correct ER formula
      const perPostEngagementRates: number[] = [];

      for (const post of media) {
        const { saved, shares, reach: postReach, plays, watchTime, avgWatchTime, profileVisits, follows, isReel } = await fetchMediaInsights(
          post.id, post.media_type, post.media_product_type, token
        );

        const postInteractions =
          (post.like_count || 0) + (post.comments_count || 0) + saved + shares;

        // Per-post ER = interactions / post_reach (only count posts with measurable reach)
        if (postReach > 0) {
          perPostEngagementRates.push((postInteractions / postReach) * 100);
        }

        // Attribute interactions to the post's IST publish date; accumulate today's
        const postIstDate = new Date(new Date(post.timestamp).getTime() + (5 * 60 + 30) * 60000).toISOString().split('T')[0];
        if (postIstDate === istToday) { todayEngagement += postInteractions; todayPosts++; }

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
          video_views: plays,
          watch_time: isReel ? watchTime : null,
          avg_watch_time: isReel ? avgWatchTime : null,
          profile_visits: isReel ? null : profileVisits,
          follows_from_content: isReel ? null : follows,
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
      const totalEngagement = totalLikes + totalComments + totalSaved + totalShares; // cumulative (logging only)

      /**
       * DAILY ENGAGEMENT (per-publish-day, FLOW metric)
       * engagement = interactions of posts published TODAY.
       * engagement_rate = today's interactions / today's account reach.
       * This is consistent across all dates (historical reconstruction uses the
       * same definition), so daily engagement charts have no cumulative spike.
       */
      const dailyEngagement = todayEngagement;
      const engagementRate = insights.reach > 0
        ? parseFloat(((dailyEngagement / insights.reach) * 100).toFixed(4))
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
        accounts_reached: insights.reach,
        profile_views: insights.profile_views,
        views: insights.views,
        accounts_engaged: insights.accounts_engaged,
        website_clicks: insights.website_clicks,
        direction_clicks: insights.direction_clicks,
        text_message_clicks: insights.text_message_clicks,
        email_clicks: insights.email_clicks,
        call_clicks: insights.call_clicks,
        likes: totalLikes,
        comments: totalComments,
        saves: totalSaved,
        shares: totalShares,
        video_views: 0,
        reels_plays: totalPlays,
        posts_published: postsPublished,
        reels_published: reelsPublished,
        carousel_posts: carouselPosts,
        engagement_rate: engagementRate,    // daily interactions / daily reach
        activation_rate: activationRate,     // daily_reach / followers
        engagement: dailyEngagement,         // per-publish-day interactions (FLOW)
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

  const toDate = (end_time: string) => {
    // Meta end_time is the morning AFTER the measured day; shift back 12h to land on the right calendar date
    const d = new Date(end_time);
    d.setHours(d.getHours() - 12);
    return d.toISOString().split('T')[0];
  };

  // Meta caps period=day insights at 30 days PER CALL. To backfill longer
  // ranges (e.g. 90 days for the 3-month view) we chunk into ≤30-day windows
  // and merge the per-day values[].
  const CHUNK = 30 * 86400;
  async function fetchDayMetricChunked(igId: string, metric: string): Promise<any[]> {
    const all: any[] = [];
    for (let s = start; s < end; s += CHUNK) {
      const e = Math.min(s + CHUNK, end);
      const j = await gql<any>(
        `${BASE}/${igId}/insights?metric=${metric}&period=day&since=${s}&until=${e}&access_token=${token}`
      ).catch((err: any) => { console.warn(`[backfill] ${metric} chunk ${s}-${e} failed: ${err.message}`); return { data: [] }; });
      const vals = j.data?.[0]?.values ?? [];
      all.push(...vals);
    }
    // De-dupe by end_time (chunk boundaries can overlap by a day)
    const seen = new Set<string>();
    return all.filter(v => { if (!v.end_time || seen.has(v.end_time)) return false; seen.add(v.end_time); return true; });
  }

  for (const brand of brands) {
    const igId = brand.instagram_business_id;
    try {
      // ── STAGE 1: API FETCH ────────────────────────────────────────────
      // Each metric must be requested separately — v19 rejects the whole
      // request if ANY metric in a comma list is invalid (the old code
      // bundled reach,impressions,profile_views; impressions is gone in v19
      // so the entire call 400'd → 0 days backfilled).
      console.log(`[backfill] ${brand.brand_name}: fetching reach + follower_count (${days}d, chunked)…`);

      const reachValues: any[] = await fetchDayMetricChunked(igId, 'reach');
      const followerValues: any[] = await fetchDayMetricChunked(igId, 'follower_count');
      console.log(`[backfill] ${brand.brand_name}: API returned ${reachValues.length} reach days, ${followerValues.length} follower days`);

      // ── STAGE 2: DATA TRANSFORM ──────────────────────────────────────
      // follower_count is a daily *delta*; reconstruct absolute counts by
      // anchoring to the current snapshot and walking backwards.
      const snapshot = await fetchAccountSnapshot(igId, token);
      const byDate: Record<string, { reach?: number; followers?: number }> = {};

      for (const rv of reachValues) {
        if (!rv.end_time || rv.value === undefined) continue;
        byDate[toDate(rv.end_time)] = { ...byDate[toDate(rv.end_time)], reach: rv.value };
      }

      // Walk backwards: today = snapshot.followers; each prior day subtracts that day's gain
      let running = snapshot.followers;
      const followerByDate: Record<string, number> = {};
      for (let i = followerValues.length - 1; i >= 0; i--) {
        const fv = followerValues[i];
        if (!fv.end_time) continue;
        followerByDate[toDate(fv.end_time)] = running;
        running -= (fv.value || 0);
      }
      for (const [date, followers] of Object.entries(followerByDate)) {
        byDate[date] = { ...byDate[date], followers };
      }

      const rows = Object.entries(byDate);
      console.log(`[backfill] ${brand.brand_name}: transformed ${rows.length} daily rows`);

      // ── STAGE 3: DATABASE INSERT ─────────────────────────────────────
      let inserted = 0, failed = 0;
      for (const [metricDate, vals] of rows) {
        const payload: any = { brand_id: brand.id, metric_date: metricDate };
        if (vals.reach !== undefined) payload.reach = vals.reach;
        if (vals.followers !== undefined) payload.followers = vals.followers;

        const { error: insErr } = await supabase
          .from('daily_metrics')
          .upsert(payload, { onConflict: 'brand_id,metric_date', ignoreDuplicates: false });

        if (insErr) { failed++; console.warn(`[backfill] insert ${metricDate} failed: ${insErr.message}`); }
        else inserted++;
      }
      console.log(`[backfill] ${brand.brand_name}: DB insert ✓ ${inserted} rows, ${failed} failed`);

      results.push({ brand: brand.brand_name, days_backfilled: inserted, days_failed: failed, reach_days: reachValues.length });
    } catch (e: any) {
      console.error(`[backfill] ${brand.brand_name}: ERROR ${e.message}`);
      results.push({ brand: brand.brand_name, error: e.message });
    }
  }

  return { success: true, results };
}
