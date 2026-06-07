"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface GrowthMetric {
  current: number;        // current window value
  previous: number;       // prior equal window value
  changePct: number | null;
  available: boolean;     // false when prior window has no data
}
export interface BrandContribution {
  brand_id: string;
  brand_name: string;
  value: number;          // net gain / delta
  pct: number;            // share of total (0–100)
}
export interface GainLossPoint { date: string; gained: number; lost: number; net: number; }

export interface GrowthAnalyticsResult {
  reachWoW: GrowthMetric;
  reachMoM: GrowthMetric;
  interactionsWoW: GrowthMetric;
  interactionsMoM: GrowthMetric;
  followerWoW: GrowthMetric;
  followerMoM: GrowthMetric;
  velocity: { followersPerDay: number; reachPerDay: number; interactionsPerDay: number };
  followerContribution: BrandContribution[];
  reachDrivers: BrandContribution[];
  gainLoss: GainLossPoint[];
  followerSeries: { date: string; value: number }[];
  daysFollowerHistory: number;
  windowDays: number;
  loading: boolean;
  error: string | null;
}

const SELECT = "brand_id, metric_date, followers, reach, engagement, new_followers, unfollows, brands ( brand_name )";

const emptyMetric: GrowthMetric = { current: 0, previous: 0, changePct: null, available: false };
const emptyResult: GrowthAnalyticsResult = {
  reachWoW: emptyMetric, reachMoM: emptyMetric, interactionsWoW: emptyMetric, interactionsMoM: emptyMetric,
  followerWoW: emptyMetric, followerMoM: emptyMetric,
  velocity: { followersPerDay: 0, reachPerDay: 0, interactionsPerDay: 0 },
  followerContribution: [], reachDrivers: [], gainLoss: [], followerSeries: [],
  daysFollowerHistory: 0, windowDays: 70, loading: true, error: null,
};

function metric(current: number, previous: number, prevHasData: boolean): GrowthMetric {
  const changePct = prevHasData && previous !== 0 ? parseFloat((((current - previous) / previous) * 100).toFixed(1)) : null;
  return { current, previous, changePct, available: prevHasData };
}

/**
 * Fixed rolling-window growth analytics (independent of the dashboard date filter):
 * WoW (7d vs prior 7d), MoM (30d vs prior 30d), velocity, brand contribution,
 * reach drivers, and follower gain-vs-loss. Reach/Interactions are flow metrics
 * (summed); Followers is a snapshot (boundary value).
 */
export function useGrowthAnalytics(brandIds: string[]): GrowthAnalyticsResult {
  const [result, setResult] = useState<GrowthAnalyticsResult>(emptyResult);

  useEffect(() => {
    if (brandIds.length === 0) { setResult({ ...emptyResult, loading: false }); return; }
    let cancelled = false;

    (async () => {
      setResult(r => ({ ...r, loading: true, error: null }));
      const today = new Date();
      const start = new Date(today); start.setDate(start.getDate() - 70);
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_metrics")
        .select(SELECT)
        .in("brand_id", brandIds)
        .gte("metric_date", fmt(start))
        .lte("metric_date", fmt(today))
        .order("metric_date", { ascending: true });
      if (cancelled) return;
      if (error) { setResult({ ...emptyResult, loading: false, error: error.message }); return; }

      const rows = (data as any[]) || [];

      // ── portfolio per-day aggregates ──────────────────────────────────────
      const byDate: Record<string, { followers: number; reach: number; interactions: number; gained: number; lost: number }> = {};
      for (const m of rows) {
        const d = m.metric_date;
        if (!byDate[d]) byDate[d] = { followers: 0, reach: 0, interactions: 0, gained: 0, lost: 0 };
        byDate[d].followers += m.followers || 0;
        byDate[d].reach += m.reach || 0;
        byDate[d].interactions += m.engagement || 0;
        byDate[d].gained += m.new_followers || 0;
        byDate[d].lost += m.unfollows || 0;
      }
      const dates = Object.keys(byDate).sort();
      const reachByDay = dates.map(d => byDate[d].reach);
      const intByDay = dates.map(d => byDate[d].interactions);

      // flow window sum helper: last n days, and the n days before that
      const tail = (arr: number[], n: number, skip = 0) => arr.slice(Math.max(0, arr.length - n - skip), arr.length - skip);
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

      const reachWoW = metric(sum(tail(reachByDay, 7)), sum(tail(reachByDay, 7, 7)), reachByDay.length >= 14);
      const reachMoM = metric(sum(tail(reachByDay, 30)), sum(tail(reachByDay, 30, 30)), reachByDay.length >= 60);
      const intWoW = metric(sum(tail(intByDay, 7)), sum(tail(intByDay, 7, 7)), intByDay.length >= 14);
      const intMoM = metric(sum(tail(intByDay, 30)), sum(tail(intByDay, 30, 30)), intByDay.length >= 60);

      // followers snapshot series (only days with real follower data)
      const folDates = dates.filter(d => byDate[d].followers > 0);
      const folSeries = folDates.map(d => ({ date: d, value: byDate[d].followers }));
      const folVals = folSeries.map(s => s.value);
      const at = (n: number) => folVals.length > n ? folVals[folVals.length - 1 - n] : null;
      const folNow = folVals[folVals.length - 1] || 0;
      const fol7 = at(7), fol30 = at(30);
      const followerWoW = metric(folNow, fol7 ?? 0, fol7 != null);
      const followerMoM = metric(folNow, fol30 ?? 0, fol30 != null);

      // velocity (last 14 days)
      const fol14 = at(14);
      const followersPerDay = fol14 != null ? Math.round((folNow - fol14) / 14) : 0;
      const reachPerDay = Math.round(sum(tail(reachByDay, 14)) / Math.min(14, reachByDay.length || 1));
      const interactionsPerDay = Math.round(sum(tail(intByDay, 14)) / Math.min(14, intByDay.length || 1));

      // ── per-brand contributions ───────────────────────────────────────────
      const brandRows: Record<string, any[]> = {};
      const brandName: Record<string, string> = {};
      for (const m of rows) {
        (brandRows[m.brand_id] = brandRows[m.brand_id] || []).push(m);
        brandName[m.brand_id] = m.brands?.brand_name || m.brand_id;
      }

      // follower net gain per brand over its available follower history
      const folGain: { brand_id: string; brand_name: string; value: number }[] = [];
      for (const [bid, rs] of Object.entries(brandRows)) {
        const withFol = rs.filter(r => (r.followers || 0) > 0).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
        if (withFol.length >= 2) folGain.push({ brand_id: bid, brand_name: brandName[bid], value: (withFol[withFol.length - 1].followers - withFol[0].followers) });
      }
      const totalFolGain = folGain.reduce((s, g) => s + Math.max(0, g.value), 0) || 1;
      const followerContribution: BrandContribution[] = folGain
        .map(g => ({ ...g, pct: (Math.max(0, g.value) / totalFolGain) * 100 }))
        .sort((a, b) => b.value - a.value);

      // reach drivers: reach delta (last7 vs prior7) per brand
      const reachDelta: { brand_id: string; brand_name: string; value: number }[] = [];
      for (const [bid, rs] of Object.entries(brandRows)) {
        const sorted = rs.sort((a, b) => a.metric_date.localeCompare(b.metric_date));
        const rb = sorted.map(r => r.reach || 0);
        reachDelta.push({ brand_id: bid, brand_name: brandName[bid], value: sum(tail(rb, 7)) - sum(tail(rb, 7, 7)) });
      }
      const totalReachDelta = reachDelta.reduce((s, g) => s + Math.abs(g.value), 0) || 1;
      const reachDrivers: BrandContribution[] = reachDelta
        .map(g => ({ ...g, pct: (g.value / totalReachDelta) * 100 }))
        .sort((a, b) => b.value - a.value);

      // gain vs loss series (days that have either signal)
      const gainLoss: GainLossPoint[] = dates
        .filter(d => byDate[d].gained > 0 || byDate[d].lost > 0)
        .map(d => ({ date: d, gained: byDate[d].gained, lost: byDate[d].lost, net: byDate[d].gained - byDate[d].lost }));

      setResult({
        reachWoW, reachMoM, interactionsWoW: intWoW, interactionsMoM: intMoM, followerWoW, followerMoM,
        velocity: { followersPerDay, reachPerDay, interactionsPerDay },
        followerContribution, reachDrivers, gainLoss, followerSeries: folSeries,
        daysFollowerHistory: folVals.length, windowDays: 70, loading: false, error: null,
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandIds.join(",")]);

  return result;
}
