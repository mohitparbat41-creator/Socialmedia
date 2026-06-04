"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface MediaMetric {
  id: string;
  brand_id: string;
  media_id: string;
  media_type: string;
  media_product_type: string | null;
  caption: string | null;
  media_url: string | null;
  permalink: string | null;
  posted_at: string;
  like_count: number;
  comments_count: number;
  reach: number;
  saved: number;
  shares: number;
  plays: number;
  video_views: number;
  total_interactions: number;
  brands: { brand_name: string } | null;
}

export function useMediaMetrics(selectedBrandIds: string[], limit = 100) {
  const [media, setMedia] = useState<MediaMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBrandIds.length === 0) {
      setMedia([]);
      setLoading(false);
      return;
    }

    async function fetchMedia() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("media_metrics")
        .select(`
          *,
          brands ( brand_name )
        `)
        .in("brand_id", selectedBrandIds)
        .order("posted_at", { ascending: false })
        .limit(limit);

      if (error) {
        setError(error.message);
      } else {
        setMedia((data as unknown as MediaMetric[]) || []);
      }
      setLoading(false);
    }

    fetchMedia();
  }, [selectedBrandIds, limit]);

  return { media, loading, error };
}
