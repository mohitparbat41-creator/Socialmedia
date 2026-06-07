"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface DailyMetric {
  id: string;
  brand_id: string;
  metric_date: string;
  followers: number;
  reach: number;
  profile_views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  video_views: number;
  reels_plays: number;
  posts_published: number;
  reels_published: number;
  carousel_posts: number;
  engagement_rate: number;
  activation_rate: number;
  engagement: number;
  media_count: number;
  // Phase 3 account-level metrics
  views: number;
  accounts_engaged: number;
  accounts_reached: number;
  website_clicks: number;
  email_clicks: number;
  call_clicks: number;
  text_message_clicks: number;
  direction_clicks: number;
  new_followers: number;
  unfollows: number;
  brands: { brand_name: string } | null;
}

export interface AggregatedMetrics {
  totalFollowers: number;
  totalReach: number;
  totalProfileViews: number;
  totalInteractions: number;
  totalMediaCount: number;
  totalContentPublished: number;
  engagementRate: number;      // Post Engagement Rate (AVG)
  activationRate: number;      // Audience Activation Rate (AVG %)
  reachMultiplier: number;     // activationRate / 100 → display as Nx (e.g. 9.93x)
  followersGrowthPct: number | null;
  reachGrowthPct: number | null;
  comparisonLabel: string;     // e.g. "vs May 22 – May 28"
  firstMetricDate: string | null;
  latestMetricDate: string | null;
  trackingStartedDate: string | null; // alias for firstMetricDate
  totalAvailableRecords: number;
}

export interface TrendPoint {
  date: string;
  [brandName: string]: number | string;
}

export interface BrandSnapshot {
  brand_id: string;
  brand_name: string;
  followers: number;
  reach: number;
  engagement: number;
  engagement_rate: number;
  activation_rate: number;
  profile_views: number;
  reach_growth: number;
  follower_growth: number;
}

function growthPct(start: number, end: number): number | null {
  if (start === 0) return null;
  return parseFloat((((end - start) / start) * 100).toFixed(1));
}

/** Formats the PREVIOUS period for display: "vs May 22 – May 28" */
export function buildComparisonLabel(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays);

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays === 0) return `vs ${fmt(prevEnd)}`;
  return `vs ${fmt(prevStart)} – ${fmt(prevEnd)}`;
}

const DM_SELECT = `
  id, brand_id, metric_date, followers, reach, profile_views,
  likes, comments, saves, shares, video_views, reels_plays,
  posts_published, reels_published, carousel_posts,
  engagement_rate, activation_rate, engagement, media_count,
  views, accounts_engaged, accounts_reached, website_clicks,
  email_clicks, call_clicks, text_message_clicks, direction_clicks,
  new_followers, unfollows,
  brands ( brand_name )
`;

/** Totals for KPI comparison. Followers/reach/profileViews = latest snapshot
 *  per brand; interactions = sum over the whole period (flow metric). */
function snapshotTotals(metrics: DailyMetric[]) {
  const latest: Record<string, DailyMetric> = {};
  for (const m of metrics) {
    if (!latest[m.brand_id] || m.metric_date > latest[m.brand_id].metric_date) latest[m.brand_id] = m;
  }
  const arr = Object.values(latest);
  return {
    followers: arr.reduce((s, m) => s + (m.followers || 0), 0),
    reach: arr.reduce((s, m) => s + (m.reach || 0), 0),
    profileViews: arr.reduce((s, m) => s + (m.profile_views || 0), 0),
    interactions: metrics.reduce((s, m) => s + (m.engagement || 0), 0),
  };
}

function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null;
  return parseFloat((((cur - prev) / prev) * 100).toFixed(1));
}

export interface PeriodComparison {
  followers: { previous: number; changePct: number | null };
  reach: { previous: number; changePct: number | null };
  profileViews: { previous: number; changePct: number | null };
  interactions: { previous: number; changePct: number | null };
  previousLabel: string;
}

export function useMetrics(selectedBrandIds: string[], dateRange: { start: string; end: string }, universeBrandIds: string[] = []) {
  const [rawMetrics, setRawMetrics] = useState<DailyMetric[]>([]);
  const [universeMetrics, setUniverseMetrics] = useState<DailyMetric[]>([]);
  const [previousMetrics, setPreviousMetrics] = useState<DailyMetric[]>([]);
  const [contentPublished, setContentPublished] = useState(0); // media posts with posted_at in range
  const [healthMetrics, setHealthMetrics] = useState<DailyMetric[]>([]); // fixed last-30-day window, universe
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBrandIds.length === 0) {
      setRawMetrics([]);
      setLoading(false);
      return;
    }

    async function fetchMetrics() {
      setLoading(true);
      setError(null);

      // Fetch for the universe if provided, else just the selected
      const idsToFetch = universeBrandIds.length > 0 ? universeBrandIds : selectedBrandIds;

      const { data, error } = await supabase
        .from("daily_metrics")
        .select(DM_SELECT)
        .in("brand_id", idsToFetch)
        .gte("metric_date", dateRange.start)
        .lte("metric_date", dateRange.end)
        .order("metric_date", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        const fetchedData = (data as unknown as DailyMetric[]) || [];
        setUniverseMetrics(fetchedData);
        const filteredData = fetchedData.filter(m => selectedBrandIds.includes(m.brand_id));
        setRawMetrics(filteredData);
      }

      // ── Previous equivalent period (for KPI comparisons) ──────────────
      const startD = new Date(dateRange.start);
      const endD = new Date(dateRange.end);
      const days = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1);
      const prevEnd = new Date(startD); prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      const { data: prevData } = await supabase
        .from("daily_metrics")
        .select(DM_SELECT)
        .in("brand_id", selectedBrandIds)
        .gte("metric_date", fmt(prevStart))
        .lte("metric_date", fmt(prevEnd))
        .order("metric_date", { ascending: true });
      setPreviousMetrics((prevData as unknown as DailyMetric[]) || []);

      // Content Published = actual posts with posted_at IN the selected range
      // (NOT the static daily_metrics.posts_published fields, which are range-
      // independent and caused "115 for every range").
      const { count: mediaCount } = await supabase
        .from("media_metrics")
        .select("*", { count: "exact", head: true })
        .in("brand_id", selectedBrandIds)
        .gte("posted_at", dateRange.start)
        .lte("posted_at", dateRange.end + "T23:59:59");
      setContentPublished(mediaCount || 0);

      // Health window: ALWAYS the last 30 days (Meta only gives ~30d of reliable
      // follower data) — independent of the dashboard's selected range.
      const today = new Date();
      const h30 = new Date(today); h30.setDate(h30.getDate() - 30);
      const healthIds = universeBrandIds.length > 0 ? universeBrandIds : selectedBrandIds;
      const { data: hData } = await supabase
        .from("daily_metrics")
        .select(DM_SELECT)
        .in("brand_id", healthIds)
        .gte("metric_date", fmt(h30))
        .lte("metric_date", fmt(today))
        .order("metric_date", { ascending: true });
      setHealthMetrics((hData as unknown as DailyMetric[]) || []);

      setLoading(false);
    }

    fetchMetrics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandIds.join(','), dateRange.start, dateRange.end, universeBrandIds.join(',')]);

  // Compute aggregated KPIs from the LATEST record per brand
  const aggregated: AggregatedMetrics = (() => {
    if (rawMetrics.length === 0) return {
      totalFollowers: 0, totalReach: 0, totalProfileViews: 0, totalInteractions: 0,
      totalMediaCount: 0, totalContentPublished: 0, engagementRate: 0, activationRate: 0,
      reachMultiplier: 0, followersGrowthPct: null, reachGrowthPct: null,
      comparisonLabel: buildComparisonLabel(dateRange.start, dateRange.end),
      firstMetricDate: null,
      latestMetricDate: null,
      trackingStartedDate: null,
      totalAvailableRecords: 0,
    };

    // Get latest and earliest record per brand
    const latestByBrand: Record<string, DailyMetric> = {};
    const earliestByBrand: Record<string, DailyMetric> = {};

    for (const m of rawMetrics) {
      if (!latestByBrand[m.brand_id] || m.metric_date > latestByBrand[m.brand_id].metric_date) {
        latestByBrand[m.brand_id] = m;
      }
      if (!earliestByBrand[m.brand_id] || m.metric_date < earliestByBrand[m.brand_id].metric_date) {
        earliestByBrand[m.brand_id] = m;
      }
    }

    const latest = Object.values(latestByBrand);
    const earliest = Object.values(earliestByBrand);

    const totalFollowers = latest.reduce((s, m) => s + (m.followers || 0), 0);      // snapshot (point-in-time)
    const totalReach = latest.reduce((s, m) => s + (m.reach || 0), 0);              // latest daily reach
    const totalProfileViews = latest.reduce((s, m) => s + (m.profile_views || 0), 0);
    // Interactions is a FLOW metric (engagement = interactions from content
    // published that day). Sum over the whole range, not just the last day —
    // otherwise the latest day (often no new posts) reads ~0.
    const totalInteractions = rawMetrics.reduce((s, m) => s + (m.engagement || 0), 0);
    const totalMediaCount = latest.reduce((s, m) => s + (m.media_count || 0), 0);
    const totalContentPublished = latest.reduce((s, m) => s + (m.posts_published || 0) + (m.reels_published || 0) + (m.carousel_posts || 0), 0);

    // Engagement Rate: average daily ER (interactions/reach) across ALL days
    // that had content engagement in the range — consistent definition.
    const daysWithEng = rawMetrics.filter(m => (m.engagement || 0) > 0 && (m.engagement_rate || 0) > 0);
    const engagementRate = daysWithEng.length > 0
      ? daysWithEng.reduce((s, m) => s + m.engagement_rate, 0) / daysWithEng.length
      : 0;

    // Average Activation Rate across selected brands
    const activeBrandsWithAR = latest.filter(m => m.activation_rate > 0);
    const activationRate = activeBrandsWithAR.length > 0 
      ? activeBrandsWithAR.reduce((s, m) => s + m.activation_rate, 0) / activeBrandsWithAR.length 
      : 0;

    const earliestWithFollowers = earliest.filter(m => m.followers > 0);
    
    let firstMetricDate = null;
    let latestMetricDate = null;
    if (rawMetrics.length > 0) {
      const sortedDates = [...new Set(rawMetrics.map(m => m.metric_date))].sort();
      const first = new Date(sortedDates[0]);
      const last = new Date(sortedDates[sortedDates.length - 1]);
      firstMetricDate = first.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      latestMetricDate = last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const startFollowers = earliestWithFollowers.reduce((s, m) => s + (m.followers || 0), 0);
    const startReach = earliest.reduce((s, m) => s + (m.reach || 0), 0);

    return {
      totalFollowers,
      totalReach,
      totalProfileViews,
      totalInteractions,
      totalMediaCount,
      totalContentPublished,
      engagementRate: parseFloat(engagementRate.toFixed(2)),
      activationRate: parseFloat(activationRate.toFixed(2)),
      // Reach Multiplier: how many times reach exceeded followers (e.g. 9.93x)
      // activationRate is stored as a %, so divide by 100 to get the raw multiple
      reachMultiplier: parseFloat((activationRate / 100).toFixed(2)),
      followersGrowthPct: growthPct(startFollowers, totalFollowers),
      reachGrowthPct: growthPct(startReach, totalReach),
      comparisonLabel: buildComparisonLabel(dateRange.start, dateRange.end),
      firstMetricDate,
      latestMetricDate,
      trackingStartedDate: firstMetricDate,
      totalAvailableRecords: rawMetrics.length,
    };
  })();

  // Build time-series trend data grouped by date with one key per brand
  const trendData: TrendPoint[] = (() => {
    const byDate: Record<string, TrendPoint> = {};
    for (const m of rawMetrics) {
      const brandName = m.brands?.brand_name || m.brand_id;
      if (!byDate[m.metric_date]) byDate[m.metric_date] = { date: m.metric_date };
      byDate[m.metric_date][`${brandName}_followers`] = m.followers || 0;
      byDate[m.metric_date][`${brandName}_reach`] = m.reach || 0;
      byDate[m.metric_date][`${brandName}_engagement`] = m.engagement || 0;
      byDate[m.metric_date][`${brandName}_engagement_rate`] = m.engagement_rate || 0;
      byDate[m.metric_date][`${brandName}_activation_rate`] = m.activation_rate || 0;
    }
    return Object.values(byDate).sort((a, b) => (a.date as string).localeCompare(b.date as string));
  })();

  function buildSnapshots(metricsSource: DailyMetric[]): BrandSnapshot[] {
    const latestByBrand: Record<string, DailyMetric> = {};
    const earliestByBrand: Record<string, DailyMetric> = {};
    // Earliest row with REAL (non-null) followers — for honest growth calc,
    // since older follower values are now null (Meta only gives ~30 days).
    const earliestFollowerByBrand: Record<string, DailyMetric> = {};
    // Period aggregates for flow metrics (engagement) so health/leaderboard
    // don't read the latest day (often 0 posts) as the brand's engagement.
    const periodEng: Record<string, number> = {};
    const periodErSum: Record<string, number> = {};
    const periodErCount: Record<string, number> = {};

    for (const m of metricsSource) {
      if (!latestByBrand[m.brand_id] || m.metric_date > latestByBrand[m.brand_id].metric_date) {
        latestByBrand[m.brand_id] = m;
      }
      if (!earliestByBrand[m.brand_id] || m.metric_date < earliestByBrand[m.brand_id].metric_date) {
        earliestByBrand[m.brand_id] = m;
      }
      if (m.followers != null && m.followers > 0 &&
          (!earliestFollowerByBrand[m.brand_id] || m.metric_date < earliestFollowerByBrand[m.brand_id].metric_date)) {
        earliestFollowerByBrand[m.brand_id] = m;
      }
      periodEng[m.brand_id] = (periodEng[m.brand_id] || 0) + (m.engagement || 0);
      if ((m.engagement || 0) > 0 && (m.engagement_rate || 0) > 0) {
        periodErSum[m.brand_id] = (periodErSum[m.brand_id] || 0) + m.engagement_rate;
        periodErCount[m.brand_id] = (periodErCount[m.brand_id] || 0) + 1;
      }
    }

    return Object.values(latestByBrand).map((m) => {
      const earliest = earliestByBrand[m.brand_id];
      const earliestF = earliestFollowerByBrand[m.brand_id];
      // Follower growth over the REAL data window only (earliest non-null → latest)
      const follower_growth = earliestF && earliestF.followers > 0 ? ((m.followers - earliestF.followers) / earliestF.followers) * 100 : 0;
      const reach_growth = earliest && earliest.reach > 0 ? ((m.reach - earliest.reach) / earliest.reach) * 100 : 0;
      const avgEr = periodErCount[m.brand_id] > 0 ? periodErSum[m.brand_id] / periodErCount[m.brand_id] : 0;

      return {
        brand_id: m.brand_id,
        brand_name: m.brands?.brand_name || m.brand_id,
        followers: m.followers || 0,
        reach: m.reach || 0,
        engagement: periodEng[m.brand_id] || 0,        // total interactions over period
        engagement_rate: avgEr,                         // avg daily ER over period
        activation_rate: m.activation_rate || 0,
        profile_views: m.profile_views || 0,
        reach_growth,
        follower_growth
      };
    }).sort((a, b) => b.followers - a.followers);
  }

  // Build brand snapshots (latest value per brand) for comparison charts
  const brandSnapshots = buildSnapshots(rawMetrics);
  const universeSnapshots = buildSnapshots(universeMetrics);

  /**
   * HEALTH snapshots — fixed 30-day window, growth = avg(last 7d) vs avg(first 7d).
   * More stable than single earliest-vs-latest day. Only uses non-null followers.
   */
  function buildHealthSnapshots(metricsSource: DailyMetric[]): BrandSnapshot[] {
    const byBrand: Record<string, DailyMetric[]> = {};
    for (const m of metricsSource) (byBrand[m.brand_id] = byBrand[m.brand_id] || []).push(m);

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // Clamp growth % to a sane band so a single brand with an anomalously low
    // early-window value (e.g. reach avg ~40 → +63000%) doesn't blow out the
    // relative max and flatten every other brand's score to ~0.
    const clampGrowth = (g: number) => Math.max(-100, Math.min(200, g));

    return Object.entries(byBrand).map(([brand_id, rows]) => {
      rows.sort((a, b) => a.metric_date.localeCompare(b.metric_date));
      const first7 = rows.slice(0, 7);
      const last7 = rows.slice(-7);

      const reachFirst = avg(first7.map(r => r.reach || 0));
      const reachLast = avg(last7.map(r => r.reach || 0));
      const reach_growth = clampGrowth(reachFirst > 0 ? ((reachLast - reachFirst) / reachFirst) * 100 : 0);

      const folFirst = avg(first7.filter(r => r.followers != null && r.followers > 0).map(r => r.followers));
      const folLast = avg(last7.filter(r => r.followers != null && r.followers > 0).map(r => r.followers));
      const follower_growth = clampGrowth(folFirst > 0 ? ((folLast - folFirst) / folFirst) * 100 : 0);

      const erDays = rows.filter(r => (r.engagement || 0) > 0 && (r.engagement_rate || 0) > 0);
      const engagement_rate = avg(erDays.map(r => r.engagement_rate));
      const latest = rows[rows.length - 1];

      return {
        brand_id,
        brand_name: latest.brands?.brand_name || brand_id,
        followers: latest.followers || 0,
        reach: latest.reach || 0,
        engagement: rows.reduce((s, r) => s + (r.engagement || 0), 0),
        engagement_rate,
        activation_rate: latest.activation_rate || 0,
        profile_views: latest.profile_views || 0,
        reach_growth,
        follower_growth,
      };
    }).sort((a, b) => b.followers - a.followers);
  }

  const healthSnapshots = buildHealthSnapshots(healthMetrics.filter(m => selectedBrandIds.includes(m.brand_id)));
  const universeHealthSnapshots = buildHealthSnapshots(healthMetrics);

  // Unique brand names for chart line keys
  const brandNames = Array.from(new Set(rawMetrics.map((m) => m.brands?.brand_name || m.brand_id)));

  // Period-over-period comparison (current snapshot vs previous equivalent window)
  const cur = snapshotTotals(rawMetrics);
  const prev = snapshotTotals(previousMetrics);
  const comparison: PeriodComparison = {
    followers:    { previous: prev.followers,    changePct: pctChange(cur.followers, prev.followers) },
    reach:        { previous: prev.reach,        changePct: pctChange(cur.reach, prev.reach) },
    profileViews: { previous: prev.profileViews, changePct: pctChange(cur.profileViews, prev.profileViews) },
    interactions: { previous: prev.interactions, changePct: pctChange(cur.interactions, prev.interactions) },
    previousLabel: buildComparisonLabel(dateRange.start, dateRange.end),
  };

  // Override static content count with the date-filtered media count
  const aggregatedWithContent = { ...aggregated, totalContentPublished: contentPublished };

  return { rawMetrics, aggregatedMetrics: aggregatedWithContent, trendData, brandSnapshots, universeSnapshots, healthSnapshots, universeHealthSnapshots, brandNames, comparison, contentPublished, loading, error };
}
