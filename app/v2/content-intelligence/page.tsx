"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, AlertTriangle, TrendingUp, ArrowDown, ArrowUpDown, Film, Image, Layers, Video, Eye, Share2, Bookmark, PlayCircle, UserCheck, UserPlus, Lightbulb, Trophy } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { calculateRelativeContentScores } from "@/lib/health-score";
import { useMetrics } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";
import { PostThumbnail } from "@/components-v2/PostThumbnail";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
    if (posts.length === 0) return { bestDay: "N/A", bestHour: "N/A", imageAvg: 0, carouselAvg: 0, videoAvg: 0, reelAvg: 0, postsByWeekday: new Array(7).fill(0), engByWeekday: new Array(7).fill(0), postsByHour: new Array(24).fill(0), engByHour: new Array(24).fill(0) };

    const dayStats: Record<number, { eng: number; count: number }> = {};
    const hourStats: Record<number, { eng: number; count: number }> = {};
    // Classify by media_product_type for accurate bucketing
    const typeStats: Record<string, { engRateSum: number; count: number }> = {
      IMAGE: { engRateSum: 0, count: 0 },
      CAROUSEL_ALBUM: { engRateSum: 0, count: 0 },
      REELS: { engRateSum: 0, count: 0 },
      VIDEO: { engRateSum: 0, count: 0 },
    };

    // Meta posted_at is UTC. Best-time must be in the audience's timezone
    // (IST / Asia/Kolkata, UTC+5:30) — not the random local TZ of whoever
    // opens the dashboard. Extract day/hour in IST deterministically.
    const istParts = (iso: string) => {
      const d = new Date(iso);
      // Shift UTC → IST (+5h30m), then read UTC fields of the shifted instant
      const ist = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
      return { day: ist.getUTCDay(), hour: ist.getUTCHours() };
    };

    // Distributions over ALL posts (for Publishing Insights charts)
    const postsByWeekday = new Array(7).fill(0);
    const engByWeekday = new Array(7).fill(0);
    const postsByHour = new Array(24).fill(0);
    const engByHour = new Array(24).fill(0);

    posts.forEach(p => {
      const rawEng = (p.like_count || 0) + (p.comments_count || 0) + (p.shares || 0) + (p.saved || 0);
      const { day, hour } = istParts(p.posted_at || p.created_at);
      postsByWeekday[day]++; engByWeekday[day] += rawEng;
      postsByHour[hour]++;   engByHour[hour] += rawEng;

      const engRate = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;
      // Best-time recommendation only from posts with measurable engagement
      if (engRate <= 0) return;

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
      postsByWeekday, engByWeekday, postsByHour, engByHour,
    };
  }, [posts]);

  // Content efficiency + watch-time metrics (from real media_metrics data)
  const efficiency = useMemo(() => {
    let reach = 0, plays = 0, shares = 0, saved = 0;
    let watchTime = 0, awtSum = 0, awtCount = 0, profileVisits = 0, followsFromContent = 0, videoViews = 0;
    posts.forEach(p => {
      reach += p.reach || 0; plays += p.plays || 0; shares += p.shares || 0; saved += p.saved || 0;
      watchTime += p.watch_time || 0;
      if (p.avg_watch_time > 0) { awtSum += p.avg_watch_time; awtCount++; }
      profileVisits += p.profile_visits || 0;
      followsFromContent += p.follows_from_content || 0;
      videoViews += p.video_views || 0;
    });
    return {
      totalViews: plays,                                           // reel/video plays = views
      viewsPerReach: reach > 0 ? plays / reach : 0,
      sharesPerReach: reach > 0 ? (shares / reach) * 100 : 0,
      savesPerReach: reach > 0 ? (saved / reach) * 100 : 0,
      videoViews,
      watchTimeHours: watchTime / 1000 / 3600,                      // ms → hours
      avgWatchTimeSec: awtCount > 0 ? (awtSum / awtCount) / 1000 : 0, // ms → seconds
      profileVisits, followsFromContent,
    };
  }, [posts]);

  // ── Strategic Content Insights (data-driven recommendations) ──
  const insights = useMemo(() => {
    const out: { icon: string; title: string; detail: string }[] = [];
    if (posts.length === 0) return out;
    // Best format by avg ER
    const fmts = [
      { name: "Reels", v: analytics.reelAvg },
      { name: "Carousels", v: analytics.carouselAvg },
      { name: "Images", v: analytics.imageAvg },
      { name: "Videos", v: analytics.videoAvg },
    ].filter(f => f.v > 0).sort((a, b) => b.v - a.v);
    if (fmts.length) out.push({ icon: "trophy", title: `${fmts[0].name} are your best format`, detail: `${fmts[0].v.toFixed(2)}% avg engagement rate — create more ${fmts[0].name.toLowerCase()}.` });
    if (fmts.length > 1) out.push({ icon: "down", title: `${fmts[fmts.length-1].name} underperform`, detail: `Only ${fmts[fmts.length-1].v.toFixed(2)}% ER — rethink or reduce ${fmts[fmts.length-1].name.toLowerCase()}.` });
    // Best posting window
    if (analytics.bestDay !== "N/A") out.push({ icon: "clock", title: `Post on ${analytics.bestDay} around ${analytics.bestHour}`, detail: `Highest historical engagement window (IST).` });
    // Highest save-rate & share-rate post
    const withReach = posts.filter(p => p.reach > 0);
    const topSave = [...withReach].sort((a, b) => (b.saved/b.reach) - (a.saved/a.reach))[0];
    const topShare = [...withReach].sort((a, b) => (b.shares/b.reach) - (a.shares/a.reach))[0];
    if (topSave && topSave.saved > 0) out.push({ icon: "save", title: "Highest save-rate content", detail: `A ${topSave.media_product_type === "REELS" ? "Reel" : topSave.media_type === "CAROUSEL_ALBUM" ? "Carousel" : "post"} saved ${topSave.saved} times (${((topSave.saved/topSave.reach)*100).toFixed(2)}% of reach) — saves signal high value; repeat this topic.` });
    if (topShare && topShare.shares > 0) out.push({ icon: "share", title: "Highest share-rate content", detail: `A post shared ${topShare.shares} times (${((topShare.shares/topShare.reach)*100).toFixed(2)}% of reach) — shares drive new reach.` });
    return out;
  }, [posts, analytics]);

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

      {/* Content KPI + Efficiency metrics (real media_metrics data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reel / Video Views", value: efficiency.totalViews.toLocaleString(), icon: Video, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", sub: "Total plays" },
          { label: "Views Per Reach", value: `${efficiency.viewsPerReach.toFixed(2)}×`, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", sub: "Plays ÷ reach" },
          { label: "Shares Per Reach", value: `${efficiency.sharesPerReach.toFixed(2)}%`, icon: Share2, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", sub: "Virality signal" },
          { label: "Saves Per Reach", value: `${efficiency.savesPerReach.toFixed(2)}%`, icon: Bookmark, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", sub: "Value signal" },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg} mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Watch-time & content-action metrics (Phase 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reel Watch Time", value: `${efficiency.watchTimeHours.toFixed(1)} hrs`, icon: PlayCircle, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", sub: "Total time watched" },
          { label: "Avg Watch Time", value: `${efficiency.avgWatchTimeSec.toFixed(1)}s`, icon: Clock, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", sub: "Per reel" },
          { label: "Profile Visits", value: efficiency.profileVisits.toLocaleString(), icon: UserCheck, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", sub: "From content" },
          { label: "Follows From Content", value: efficiency.followsFromContent.toLocaleString(), icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", sub: "New follows" },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg} mb-3`}><Icon className={`h-4 w-4 ${color}`} /></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Strategic Content Insights — data-driven recommendations */}
      {insights.length > 0 && (
        <Card className="shadow-lg rounded-2xl border-0 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-900/10 dark:to-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Lightbulb className="h-4 w-4 text-indigo-600" /></div>
              Strategic Content Insights
              <span className="ml-auto text-[9px] font-medium text-gray-400">auto-generated from your data</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-3 p-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  {ins.icon === "trophy" ? <Trophy className="h-4 w-4 text-amber-500" />
                    : ins.icon === "down" ? <ArrowDown className="h-4 w-4 text-rose-500" />
                    : ins.icon === "clock" ? <Clock className="h-4 w-4 text-indigo-500" />
                    : ins.icon === "save" ? <Bookmark className="h-4 w-4 text-emerald-500" />
                    : <Share2 className="h-4 w-4 text-blue-500" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{ins.title}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{ins.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
              <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">IST</span>
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

      {/* Publishing Insights — posts & engagement by weekday/hour (IST) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><BarChart3 className="h-4 w-4 text-indigo-600" /></div>
              Posts &amp; Engagement by Weekday
              <span className="ml-auto text-[9px] font-medium text-gray-400">IST</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <Bar
                data={{
                  labels: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
                  datasets: [
                    { label: "Posts", data: analytics.postsByWeekday, backgroundColor: "#6366f1", borderRadius: 4, yAxisID: "y" },
                    { label: "Engagement", data: analytics.engByWeekday, backgroundColor: "#ec4899", borderRadius: 4, yAxisID: "y1" },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 }, color: "rgba(150,150,150,0.9)" } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 10 } } },
                    y: { position: "left", grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "#6366f1", font: { size: 10 } }, title: { display: true, text: "Posts", color: "#6366f1", font: { size: 9 } } },
                    y1: { position: "right", grid: { display: false }, ticks: { color: "#ec4899", font: { size: 10 } }, title: { display: true, text: "Engagement", color: "#ec4899", font: { size: 9 } } },
                  },
                } as any}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Clock className="h-4 w-4 text-purple-600" /></div>
              Posts by Hour
              <span className="ml-auto text-[9px] font-medium text-gray-400">IST</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <Bar
                data={{
                  labels: Array.from({ length: 24 }, (_, h) => h),
                  datasets: [{ label: "Posts", data: analytics.postsByHour, backgroundColor: "#8b5cf6", borderRadius: 3 }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i: any) => `${i[0].label}:00 IST` } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 9 }, maxTicksLimit: 12 } },
                    y: { grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 } } },
                  },
                } as any}
              />
            </div>
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
                const isTop = activeTab === "top";

                return (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <PostThumbnail
                        src={post.media_url}
                        permalink={post.permalink}
                        mediaType={post.media_type}
                        productType={post.media_product_type}
                        size={48}
                      />
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
