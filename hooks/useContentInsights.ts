"use client";

import { useMemo } from "react";
import { MediaMetric } from "./useMediaMetrics";

export interface ContentInsights {
  bestDay: { day: string; avgReach: number } | null;
  bestHour: { hour: string; avgReach: number } | null;
  bestFormat: { format: string; avgEngagement: number } | null;
  mixAnalysis: {
    format: string;
    count: number;
    avgReach: number;
    avgInteractions: number;
    shareRate: number; // avg shares per post
  }[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function useContentInsights(media: MediaMetric[]) {
  return useMemo<ContentInsights>(() => {
    if (!media || media.length === 0) {
      return { bestDay: null, bestHour: null, bestFormat: null, mixAnalysis: [] };
    }

    const dayStats: Record<number, { reachSum: number; count: number }> = {};
    const hourStats: Record<number, { reachSum: number; count: number }> = {};
    const formatStats: Record<string, { reachSum: number; interactionSum: number; sharesSum: number; count: number }> = {};

    for (const post of media) {
      const date = new Date(post.posted_at);
      const day = date.getDay();
      const hour = date.getHours();
      const format = post.media_product_type || post.media_type;

      // For Reels/Video: Meta often returns reach=0 but plays has data.
      // Use plays as the reach proxy when reach is unavailable.
      const isVideoFormat = format === 'REELS' || post.media_type === 'VIDEO';
      const effectiveReach = (post.reach > 0) ? post.reach : (isVideoFormat && post.plays > 0 ? post.plays : 0);

      // Day stats
      if (!dayStats[day]) dayStats[day] = { reachSum: 0, count: 0 };
      dayStats[day].reachSum += effectiveReach;
      dayStats[day].count++;

      // Hour stats
      if (!hourStats[hour]) hourStats[hour] = { reachSum: 0, count: 0 };
      hourStats[hour].reachSum += effectiveReach;
      hourStats[hour].count++;

      // Format stats
      if (!formatStats[format]) formatStats[format] = { reachSum: 0, interactionSum: 0, sharesSum: 0, count: 0 };
      formatStats[format].reachSum += effectiveReach;
      formatStats[format].interactionSum += post.total_interactions;
      formatStats[format].sharesSum += post.shares;
      formatStats[format].count++;
    }


    // Find best day (by avg reach)
    let bestDay = null;
    let maxDayReach = -1;
    for (const [dayStr, stats] of Object.entries(dayStats)) {
      const avg = stats.reachSum / stats.count;
      if (avg > maxDayReach) {
        maxDayReach = avg;
        bestDay = { day: DAYS[parseInt(dayStr)], avgReach: Math.round(avg) };
      }
    }

    // Find best hour (by avg reach)
    let bestHour = null;
    let maxHourReach = -1;
    for (const [hourStr, stats] of Object.entries(hourStats)) {
      const avg = stats.reachSum / stats.count;
      if (avg > maxHourReach) {
        maxHourReach = avg;
        const hr = parseInt(hourStr);
        const ampm = hr >= 12 ? 'PM' : 'AM';
        const hr12 = hr % 12 || 12;
        bestHour = { hour: `${hr12}:00 ${ampm}`, avgReach: Math.round(avg) };
      }
    }

    // Format Mix Analysis
    const mixAnalysis = Object.entries(formatStats).map(([format, stats]) => ({
      format,
      count: stats.count,
      avgReach: Math.round(stats.reachSum / stats.count),
      avgInteractions: Math.round(stats.interactionSum / stats.count),
      shareRate: parseFloat((stats.sharesSum / stats.count).toFixed(2))
    })).sort((a, b) => b.avgInteractions - a.avgInteractions);

    const bestFormat = mixAnalysis.length > 0 
      ? { format: mixAnalysis[0].format, avgEngagement: mixAnalysis[0].avgInteractions }
      : null;

    return {
      bestDay,
      bestHour,
      bestFormat,
      mixAnalysis
    };
  }, [media]);
}
