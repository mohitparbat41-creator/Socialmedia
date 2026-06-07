"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  MediaPost, FormatStat, Evidence,
  formatBreakdown, bestFormat, bestDay, bestHour, contentRoiScore, fmtHour12,
} from "@/lib/content-insights";

const MEDIA_SELECT = `
  id, brand_id, media_id, media_type, media_product_type, caption, media_url, permalink,
  posted_at, created_at, like_count, comments_count, reach, saved, shares, plays, video_views,
  total_interactions, watch_time, avg_watch_time, profile_visits, follows_from_content
`;

export interface AudiencePeak { hour: number; label: string; value: number; }

export interface ContentInsights {
  posts: MediaPost[];
  postsAnalyzed: number;
  formatStats: FormatStat[];
  bestFormat: Evidence | null;
  bestDay: Evidence | null;
  bestHour: Evidence | null;
  contentRoi: number;
  audiencePeak: AudiencePeak | null;  // from corrected online_followers (IST)
  loading: boolean;
  error: string | null;
}

/**
 * Fetches in-range posts + current audience-activity for the given brands and
 * derives the evidence-backed content insights used across the dashboard
 * (Executive summary cards, Content Intelligence, Content Library).
 */
export function useContentInsights(
  brandIds: string[],
  dateRange: { start: string; end: string },
): ContentInsights {
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [audiencePeak, setAudiencePeak] = useState<AudiencePeak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brandIds.length === 0) { setPosts([]); setAudiencePeak(null); setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true); setError(null);
      // ── posts in range (paginated) ───────────────────────────────────────
      const all: MediaPost[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("media_metrics")
          .select(MEDIA_SELECT)
          .in("brand_id", brandIds)
          .gte("posted_at", dateRange.start)
          .lte("posted_at", dateRange.end + "T23:59:59")
          .order("posted_at", { ascending: false })
          .range(from, from + 999);
        if (error) { if (!cancelled) setError(error.message); break; }
        if (!data || data.length === 0) break;
        all.push(...(data as unknown as MediaPost[]));
        if (data.length < 1000) break;
        from += 1000;
      }
      if (cancelled) return;
      setPosts(all);

      // ── audience activity peak (latest demographics row per brand) ───────
      const { data: demo } = await supabase
        .from("audience_demographics")
        .select("brand_id, metric_date, gender_age")
        .in("brand_id", brandIds)
        .order("metric_date", { ascending: false });
      if (!cancelled && demo) {
        const latest: Record<string, any> = {};
        for (const d of demo) if (!latest[d.brand_id]) latest[d.brand_id] = d;
        const hourTotals: Record<number, number> = {};
        for (const d of Object.values(latest)) {
          const act = (d as any).gender_age?.activity || {};
          for (const [h, v] of Object.entries(act)) hourTotals[+h] = (hourTotals[+h] || 0) + (v as number);
        }
        const entries = Object.entries(hourTotals);
        if (entries.length) {
          const [h, v] = entries.sort((a, b) => (b[1] as number) - (a[1] as number))[0];
          setAudiencePeak({ hour: +h, label: fmtHour12(+h), value: v as number });
        } else setAudiencePeak(null);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandIds.join(","), dateRange.start, dateRange.end]);

  return {
    posts,
    postsAnalyzed: posts.length,
    formatStats: formatBreakdown(posts),
    bestFormat: bestFormat(posts),
    bestDay: bestDay(posts),
    bestHour: bestHour(posts),
    contentRoi: contentRoiScore(posts),
    audiencePeak,
    loading,
    error,
  };
}
