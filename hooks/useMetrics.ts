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

export function useMetrics(selectedBrandIds: string[], dateRange: { start: string; end: string }, universeBrandIds: string[] = []) {
  const [rawMetrics, setRawMetrics] = useState<DailyMetric[]>([]);
  const [universeMetrics, setUniverseMetrics] = useState<DailyMetric[]>([]);
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
        .select(`
          id,
          brand_id,
          metric_date,
          followers,
          reach,
          profile_views,
          likes,
          comments,
          saves,
          shares,
          video_views,
          reels_plays,
          posts_published,
          reels_published,
          carousel_posts,
          engagement_rate,
          activation_rate,
          engagement,
          media_count,
          brands ( brand_name )
        `)
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

        console.log("Selected Brands:", selectedBrandIds);
        console.log("Metrics Count:", filteredData.length);
        console.log("Date Range:", dateRange);
        if (filteredData.length > 0) {
          const latestMetric = filteredData.reduce((latest, current) => 
            current.metric_date > latest.metric_date ? current : latest
          , filteredData[0]);
          console.log("Latest Metric:", latestMetric);
        }
      }
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

    const totalFollowers = latest.reduce((s, m) => s + (m.followers || 0), 0);
    const totalReach = latest.reduce((s, m) => s + (m.reach || 0), 0);
    const totalProfileViews = latest.reduce((s, m) => s + (m.profile_views || 0), 0);
    const totalInteractions = latest.reduce((s, m) => s + (m.engagement || 0), 0);
    const totalMediaCount = latest.reduce((s, m) => s + (m.media_count || 0), 0);
    const totalContentPublished = latest.reduce((s, m) => s + (m.posts_published || 0) + (m.reels_published || 0) + (m.carousel_posts || 0), 0);
    
    // Average Engagement Rate across selected brands (already calculated as AVG post_interations/post_reach per brand)
    const activeBrandsWithER = latest.filter(m => m.engagement_rate > 0);
    const engagementRate = activeBrandsWithER.length > 0 
      ? activeBrandsWithER.reduce((s, m) => s + m.engagement_rate, 0) / activeBrandsWithER.length 
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

    for (const m of metricsSource) {
      if (!latestByBrand[m.brand_id] || m.metric_date > latestByBrand[m.brand_id].metric_date) {
        latestByBrand[m.brand_id] = m;
      }
      if (!earliestByBrand[m.brand_id] || m.metric_date < earliestByBrand[m.brand_id].metric_date) {
        earliestByBrand[m.brand_id] = m;
      }
    }
    
    return Object.values(latestByBrand).map((m) => {
      const earliest = earliestByBrand[m.brand_id];
      const follower_growth = earliest && earliest.followers > 0 ? ((m.followers - earliest.followers) / earliest.followers) * 100 : 0;
      const reach_growth = earliest && earliest.reach > 0 ? ((m.reach - earliest.reach) / earliest.reach) * 100 : 0;

      return {
        brand_id: m.brand_id,
        brand_name: m.brands?.brand_name || m.brand_id,
        followers: m.followers || 0,
        reach: m.reach || 0,
        engagement: m.engagement || 0,
        engagement_rate: m.engagement_rate || 0,
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

  // Unique brand names for chart line keys
  const brandNames = Array.from(new Set(rawMetrics.map((m) => m.brands?.brand_name || m.brand_id)));

  return { rawMetrics, aggregatedMetrics: aggregated, trendData, brandSnapshots, universeSnapshots, brandNames, loading, error };
}
