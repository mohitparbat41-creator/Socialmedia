"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, AlertTriangle, TrendingUp, ArrowDown, ArrowUpDown, ExternalLink, Film, Image, Layers, Video } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { calculateRelativeContentScores } from "@/lib/health-score";
import { useMetrics } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";

type SortKey = "contentScore" | "reach" | "like_count" | "comments_count" | "shares" | "saved" | "engRate";
type SortDir = "desc" | "asc";
type Tab = "top" | "worst";

export default function V2ContentIntelligence() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("top");
  const [sortKey, setSortKey] = useState<SortKey>("contentScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { loading: isLoading } = useMetrics(selectedBrandIds, {
    start: dateRange.start, end: dateRange.end,
  });

  useEffect(() => {
    async function loadMedia() {
      if (selectedBrandIds.length === 0) return;
      setLoadingPosts(true);
      const { data, error } = await supabase
        .from("media_metrics")
        .select("*")
        .in("brand_id", selectedBrandIds)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!error && data) {
        const scored = calculateRelativeContentScores(data.map(p => ({
          ...p,
          reach: p.reach || 0,
          engagement: p.total_interactions || p.like_count || 0,
          shares: p.shares || 0,
        })));
        setPosts(scored);
      }
      setLoadingPosts(false);
    }
    loadMedia();
  }, [selectedBrandIds]);

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || "Unknown";

  // Best time / format analysis
  const analytics = useMemo(() => {
    if (posts.length === 0) return { bestDay: "N/A", bestHour: "N/A", imageAvg: 0, carouselAvg: 0, videoAvg: 0, reelAvg: 0 };

    const dayStats: Record<number, { eng: number; count: number }> = {};
    const hourStats: Record<number, { eng: number; count: number }> = {};
    // Classify by media_product_type for accurate bucketing
    const typeStats: Record<string, { engRateSum: number; count: number }> = {
      IMAGE: { engRateSum: 0, count: 0 },
      CAROUSEL_ALBUM: { engRateSum: 0, count: 0 },
      REELS: { engRateSum: 0, count: 0 },
      VIDEO: { engRateSum: 0, count: 0 },
    };

    posts.forEach(p => {
      const d = new Date(p.posted_at || p.created_at);
      const engRate = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;
      const day = d.getDay(), hour = d.getHours();

      if (!dayStats[day]) dayStats[day] = { eng: 0, count: 0 };
      dayStats[day].eng += engRate; dayStats[day].count++;
      if (!hourStats[hour]) hourStats[hour] = { eng: 0, count: 0 };
      hourStats[hour].eng += engRate; hourStats[hour].count++;

      // Use media_product_type first, fall back to media_type
      let bucket: string;
      if (p.media_product_type === "REELS") bucket = "REELS";
      else if (p.media_type === "CAROUSEL_ALBUM") bucket = "CAROUSEL_ALBUM";
      else if (p.media_type === "VIDEO") bucket = "VIDEO";
      else bucket = "IMAGE";

      if (typeStats[bucket]) { typeStats[bucket].engRateSum += engRate; typeStats[bucket].count++; }
    });

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let bestDay = "N/A"; let maxDay = 0;
    Object.keys(dayStats).forEach(d => {
      const avg = dayStats[+d].eng / dayStats[+d].count;
      if (avg > maxDay) { maxDay = avg; bestDay = days[+d]; }
    });

    let bestHour = "N/A"; let maxHr = 0;
    Object.keys(hourStats).forEach(h => {
      const avg = hourStats[+h].eng / hourStats[+h].count;
      if (avg > maxHr) {
        maxHr = avg;
        const hr = +h;
        bestHour = hr === 0 ? "12 AM" : hr < 12 ? `${hr} AM` : hr === 12 ? "12 PM" : `${hr - 12} PM`;
      }
    });

    const avg = (t: string) => typeStats[t].count > 0 ? typeStats[t].engRateSum / typeStats[t].count : 0;
    return {
      bestDay, bestHour,
      imageAvg: avg("IMAGE"),
      carouselAvg: avg("CAROUSEL_ALBUM"),
      reelAvg: avg("REELS"),
      videoAvg: avg("VIDEO"),
    };
  }, [posts]);

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir(activeTab === "top" ? "desc" : "asc"); }
  }

  const sortedPosts = useMemo(() => {
    const engRate = (p: any) => p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;
    const getValue = (p: any): number => sortKey === "engRate" ? engRate(p) : ((p[sortKey] as number) || 0);
    return [...posts].sort((a, b) => sortDir === "desc" ? getValue(b) - getValue(a) : getValue(a) - getValue(b));
  }, [posts, sortKey, sortDir]);

  const displayedPosts = useMemo(() => {
    if (activeTab === "top") {
      // Top 20 = highest scored
      return [...posts].sort((a, b) => b.contentScore - a.contentScore).slice(0, 20);
    } else {
      // Worst 20 = lowest scored
      return [...posts].sort((a, b) => a.contentScore - b.contentScore).slice(0, 20);
    }
  }, [posts, activeTab]);

  // Apply additional sort on top of tab selection if user clicked a column
  const tablePosts = useMemo(() => {
    const base = displayedPosts;
    const engRate = (p: any) => p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;
    const getValue = (p: any): number => sortKey === "engRate" ? engRate(p) : ((p[sortKey] as number) || 0);
    return [...base].sort((a, b) => sortDir === "desc" ? getValue(b) - getValue(a) : getValue(a) - getValue(b));
  }, [displayedPosts, sortKey, sortDir]);

  const maxFormatAvg = Math.max(analytics.imageAvg, analytics.carouselAvg, analytics.reelAvg, analytics.videoAvg, 0.001);

  const SORT_COLS: { key: SortKey; label: string }[] = [
    { key: "contentScore", label: "Score" },
    { key: "reach", label: "Reach" },
    { key: "like_count", label: "Likes" },
    { key: "comments_count", label: "Cmts" },
    { key: "shares", label: "Shares" },
    { key: "saved", label: "Saved" },
    { key: "engRate", label: "ER%" },
  ];

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Intelligence</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-500/80">Select at least one brand to view content analytics.</p>
        </div>
      </div>
    );
  }

  if (isLoading || loadingPosts) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading Content Intelligence…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Intelligence</h2>
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-full">{dateRange.label} · {posts.length} posts</span>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Best time */}
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Clock className="h-4 w-4 text-indigo-600" />
              </div>
              Best Posting Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            <div className="flex justify-between items-center p-3 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-xl">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Best Day</p>
                <p className="text-xl font-bold text-indigo-600">{analytics.bestDay}</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50/70 dark:bg-purple-900/20 rounded-xl">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Best Hour</p>
                <p className="text-xl font-bold text-purple-600">{analytics.bestHour}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Format Performance — using media_product_type for accurate bucketing */}
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </div>
              Format Performance (Avg Engagement Rate)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-3 h-32 items-end">
              {[
                { label: "Image", value: analytics.imageAvg, color: "from-emerald-500 to-emerald-400", Icon: Image },
                { label: "Carousel", value: analytics.carouselAvg, color: "from-indigo-500 to-indigo-400", Icon: Layers },
                { label: "Reels", value: analytics.reelAvg, color: "from-pink-500 to-pink-400", Icon: Film },
                { label: "Video", value: analytics.videoAvg, color: "from-amber-500 to-amber-400", Icon: Video },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-t-lg h-20 flex items-end overflow-hidden">
                    <div
                      className={`w-full bg-gradient-to-t ${color} rounded-t-lg transition-all duration-700`}
                      style={{ height: `${(value / maxFormatAvg) * 100}%`, minHeight: value > 0 ? "3px" : "0" }}
                    />
                  </div>
                  <Icon className="h-3 w-3 text-gray-400" />
                  <p className="text-[9px] font-bold text-gray-500 uppercase">{label}</p>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">{value.toFixed(2)}%</p>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 mt-2 text-right">Reels detected via media_product_type field</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {([
            { key: "top" as Tab, label: "Top 20 Content", icon: TrendingUp, color: "text-emerald-600 border-emerald-500" },
            { key: "worst" as Tab, label: "Worst 20 Content", icon: ArrowDown, color: "text-rose-600 border-rose-500" },
          ]).map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSortKey("contentScore"); setSortDir(key === "top" ? "desc" : "asc"); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors",
                activeTab === key
                  ? `${color} bg-gray-50/50 dark:bg-gray-900/30`
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 px-4 text-xs text-gray-500">
            <span className="hidden sm:inline font-medium">Sort:</span>
            {SORT_COLS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium transition-colors",
                  sortKey === key
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto">
          <table className="w-full text-xs text-left min-w-[680px]">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 w-14">Post</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Brand</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Type</th>
                {SORT_COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    className={cn(
                      "px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 text-right cursor-pointer select-none hover:text-indigo-600 transition-colors",
                      sortKey === key && "text-indigo-600 dark:text-indigo-400"
                    )}
                    onClick={() => handleSort(key)}
                  >
                    <span className="flex items-center justify-end gap-1">
                      {label}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {tablePosts.map((post) => {
                const engRate = post.reach > 0 ? ((post.engagement / post.reach) * 100).toFixed(2) : "0";
                const isReel = post.media_product_type === "REELS";
                const typeLabel = isReel ? "Reel" : post.media_type === "CAROUSEL_ALBUM" ? "Carousel" : post.media_type === "VIDEO" ? "Video" : "Image";
                const typeColor = isReel ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                  : post.media_type === "CAROUSEL_ALBUM" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : post.media_type === "VIDEO" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
                const url = post.permalink || post.media_url;
                const isTop = activeTab === "top";

                return (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="relative group/thumb w-12 h-12">
                        {post.thumbnail_url || post.media_url ? (
                          <img
                            src={post.thumbnail_url || post.media_url}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[9px] text-gray-400">No img</div>
                        )}
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-white" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate">{getBrandName(post.brand_id)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(post.posted_at || post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${typeColor}`}>{typeLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isTop ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>
                        {post.contentScore?.toFixed(1) || "0.0"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{(post.reach || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{(post.like_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{(post.comments_count || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{(post.shares || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{(post.saved || 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{engRate}%</td>
                  </tr>
                );
              })}
              {tablePosts.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No posts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
