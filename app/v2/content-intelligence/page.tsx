"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, AlertTriangle, TrendingUp, ArrowDown, ArrowUpDown, Film, Video, Eye, Share2, Bookmark, PlayCircle, UserCheck, UserPlus, Lightbulb, Trophy, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PostThumbnail } from "@/components-v2/PostThumbnail";
import { InfoTip, EvidenceChips } from "@/components-v2/Evidence";
import { useContentInsights } from "@/hooks/useContentInsights";
import {
  MediaPost, weekdayBreakdown, hourBreakdown, buildContentScorer,
  postFormat, postEngagement, postER, postViews, dayShort,
} from "@/lib/content-insights";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type SortKey = "contentScore" | "reach" | "like_count" | "comments_count" | "shares" | "saved" | "engRate";
type SortDir = "desc" | "asc";
type Tab = "top" | "worst";
type WeekdayMode = "totals" | "averages";

export default function V2ContentIntelligence() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const [activeTab, setActiveTab] = useState<Tab>("top");
  const [sortKey, setSortKey] = useState<SortKey>("contentScore");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [weekdayMode, setWeekdayMode] = useState<WeekdayMode>("totals");

  const { posts, formatStats, bestFormat, bestDay, bestHour, audiencePeak, postsAnalyzed, loading } =
    useContentInsights(selectedBrandIds, { start: dateRange.start, end: dateRange.end });

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || "Unknown";

  // Per-post content scores (same scorer as the Content Library)
  const scoredPosts = useMemo(() => {
    const score = buildContentScorer(posts);
    return posts.map(p => ({ ...p, contentScore: score(p) }));
  }, [posts]);

  // Efficiency + watch-time metrics
  const efficiency = useMemo(() => {
    let reach = 0, plays = 0, shares = 0, saved = 0, watchTime = 0, awtSum = 0, awtCount = 0, profileVisits = 0, follows = 0, videoViews = 0;
    posts.forEach(p => {
      reach += p.reach || 0; plays += p.plays || 0; shares += p.shares || 0; saved += p.saved || 0;
      watchTime += p.watch_time || 0;
      if ((p.avg_watch_time || 0) > 0) { awtSum += p.avg_watch_time || 0; awtCount++; }
      profileVisits += p.profile_visits || 0; follows += p.follows_from_content || 0; videoViews += p.video_views || 0;
    });
    return {
      totalViews: plays,
      viewsPerReach: reach > 0 ? plays / reach : 0,
      sharesPerReach: reach > 0 ? (shares / reach) * 100 : 0,
      savesPerReach: reach > 0 ? (saved / reach) * 100 : 0,
      videoViews,
      watchTimeHours: watchTime / 1000 / 3600,
      avgWatchTimeSec: awtCount > 0 ? (awtSum / awtCount) / 1000 : 0,
      profileVisits, followsFromContent: follows,
    };
  }, [posts]);

  const weekday = useMemo(() => weekdayBreakdown(posts), [posts]);
  const hourly = useMemo(() => hourBreakdown(posts), [posts]);

  // Strategic insights with statistical evidence
  const topSaveShare = useMemo(() => {
    const withReach = posts.filter(p => (p.reach || 0) > 0);
    const topSave = [...withReach].sort((a, b) => ((b.saved || 0) / (b.reach || 1)) - ((a.saved || 0) / (a.reach || 1)))[0];
    const topShare = [...withReach].sort((a, b) => ((b.shares || 0) / (b.reach || 1)) - ((a.shares || 0) / (a.reach || 1)))[0];
    return { topSave, topShare };
  }, [posts]);

  const worstFormat = useMemo(() => {
    const elig = formatStats.filter(f => f.posts >= 3);
    return elig.length > 1 ? [...elig].sort((a, b) => a.avgER - b.avgER)[0] : null;
  }, [formatStats]);

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir(activeTab === "top" ? "desc" : "asc"); }
  }

  const displayedPosts = useMemo(() => {
    const sorted = activeTab === "top"
      ? [...scoredPosts].sort((a, b) => b.contentScore - a.contentScore).slice(0, 20)
      : [...scoredPosts].sort((a, b) => a.contentScore - b.contentScore).slice(0, 20);
    const engRate = (p: any) => postER(p);
    const getValue = (p: any): number => sortKey === "engRate" ? engRate(p) : ((p[sortKey] as number) || 0);
    return [...sorted].sort((a, b) => sortDir === "desc" ? getValue(b) - getValue(a) : getValue(a) - getValue(b));
  }, [scoredPosts, activeTab, sortKey, sortDir]);

  const maxFormatER = Math.max(...formatStats.map(f => f.avgER), 0.001);

  const SORT_COLS: { key: SortKey; label: string }[] = [
    { key: "contentScore", label: "Score" },
    { key: "reach", label: "Reach" },
    { key: "like_count", label: "Likes" },
    { key: "comments_count", label: "Cmts" },
    { key: "shares", label: "Shares" },
    { key: "saved", label: "Saved" },
    { key: "engRate", label: "ER%" },
  ];

  const nf = (n: number) => n.toLocaleString();

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

  if (loading) {
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
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-full">{dateRange.label} · {postsAnalyzed} posts analyzed</span>
      </div>

      {/* Content efficiency metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reel / Video Views", value: nf(efficiency.totalViews), icon: Video, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", sub: "Total plays" },
          { label: "Views Per Reach", value: `${efficiency.viewsPerReach.toFixed(2)}×`, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", sub: "Plays ÷ reach" },
          { label: "Shares Per Reach", value: `${efficiency.sharesPerReach.toFixed(2)}%`, icon: Share2, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", sub: "Virality signal" },
          { label: "Saves Per Reach", value: `${efficiency.savesPerReach.toFixed(2)}%`, icon: Bookmark, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", sub: "Value signal" },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg} mb-3`}><Icon className={`h-4 w-4 ${color}`} /></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Watch-time & content-action metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reel Watch Time", value: `${efficiency.watchTimeHours.toFixed(1)} hrs`, icon: PlayCircle, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", sub: "Total time watched" },
          { label: "Avg Watch Time", value: `${efficiency.avgWatchTimeSec.toFixed(1)}s`, icon: Clock, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30", sub: "Per reel" },
          { label: "Profile Visits", value: nf(efficiency.profileVisits), icon: UserCheck, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", sub: "From content (feed/carousel)" },
          { label: "Follows From Content", value: nf(efficiency.followsFromContent), icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", sub: "From content (feed/carousel)" },
        ].map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg} mb-3`}><Icon className={`h-4 w-4 ${color}`} /></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Performance by Format (Section 4) ─────────────────────────────── */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><BarChart3 className="h-4 w-4 text-emerald-600" /></div>
            Performance by Format
            <InfoTip info={{ formula: "Per-format aggregates over posts in range. ER = avg per-post (interactions ÷ reach). Watch time = Σ ms → hrs.", source: "media_metrics (classified by media_product_type / media_type)", validation: "Profile Visits & Follows are not reported by Meta for Reels (shown N/A)" }} />
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">{postsAnalyzed} posts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-auto">
          <table className="w-full text-xs text-left min-w-[760px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="py-2 pr-3 font-bold">Format</th>
                <th className="py-2 px-2 font-bold text-right">Posts</th>
                <th className="py-2 px-2 font-bold text-right">Reach</th>
                <th className="py-2 px-2 font-bold text-right">Avg ER</th>
                <th className="py-2 px-2 font-bold text-right">Saves</th>
                <th className="py-2 px-2 font-bold text-right">Shares</th>
                <th className="py-2 px-2 font-bold text-right">Profile Visits</th>
                <th className="py-2 px-2 font-bold text-right">Follows</th>
                <th className="py-2 px-2 font-bold text-right">Watch (hrs)</th>
                <th className="py-2 px-2 font-bold text-right">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {formatStats.map(f => {
                const color = f.format === "Reel" ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                  : f.format === "Carousel" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : f.format === "Video" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
                return (
                  <tr key={f.format} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>{f.format}</span></td>
                    <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-white">{f.posts}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{nf(f.reach)}</td>
                    <td className="py-2 px-2 text-right font-bold text-indigo-600 dark:text-indigo-400">{f.avgER.toFixed(2)}%</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{nf(f.saves)}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{nf(f.shares)}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{f.profileVisitsAvailable ? nf(f.profileVisits) : <span className="text-gray-300 dark:text-gray-600" title="Meta does not report this for Reels">N/A</span>}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{f.profileVisitsAvailable ? nf(f.follows) : <span className="text-gray-300 dark:text-gray-600" title="Meta does not report this for Reels">N/A</span>}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{f.watchHours > 0 ? f.watchHours.toFixed(1) : "—"}</td>
                    <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{f.views > 0 ? nf(f.views) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[10px] text-gray-400 mt-2">Profile Visits / Follows shown <strong>N/A</strong> for Reels — Meta's API does not return profile-action breakdowns for Reels (only feed posts &amp; carousels). Views = plays for Reels/Video; static formats have no separate view count.</p>
        </CardContent>
      </Card>

      {/* ── Strategic Content Insights with evidence (Section 2) ──────────── */}
      <Card className="shadow-lg rounded-2xl border-0 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-900/10 dark:to-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Lightbulb className="h-4 w-4 text-indigo-600" /></div>
            Strategic Content Insights
            <InfoTip info={{ formula: "Each recommendation is the best bucket by avg ER. Significance = Welch t-test vs the rest. Confidence = sample adequacy × effect size.", source: "media_metrics", validation: `Based on ${postsAnalyzed} posts in range; chips show evidence` }} />
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">evidence-backed · {postsAnalyzed} posts</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
          {bestFormat && (
            <div className="p-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0"><Trophy className="h-4 w-4 text-amber-500" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{bestFormat.label} is your best format</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{bestFormat.metric.toFixed(2)}% avg ER ({bestFormat.liftPct >= 0 ? "+" : ""}{bestFormat.liftPct.toFixed(0)}% vs overall) — create more {bestFormat.label.toLowerCase()}s.</p>
                  <EvidenceChips e={bestFormat} />
                </div>
              </div>
            </div>
          )}
          {worstFormat && (
            <div className="p-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center flex-shrink-0"><ArrowDown className="h-4 w-4 text-rose-500" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{worstFormat.format}s underperform</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{worstFormat.avgER.toFixed(2)}% avg ER across {worstFormat.posts} posts — rethink or reduce {worstFormat.format.toLowerCase()}s.</p>
                </div>
              </div>
            </div>
          )}
          {bestDay && (
            <div className="p-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0"><CalendarDays className="h-4 w-4 text-indigo-500" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Post on {bestDay.label}{audiencePeak ? ` around ${audiencePeak.label}` : bestHour ? ` around ${bestHour.label}` : ""}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{bestDay.label} posts average {bestDay.metric.toFixed(2)}% ER (IST){audiencePeak ? `; audience is most active at ${audiencePeak.label}` : ""}.</p>
                  <EvidenceChips e={bestDay} />
                </div>
              </div>
            </div>
          )}
          {topSaveShare.topSave && (topSaveShare.topSave.saved || 0) > 0 && (
            <div className="p-3 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0"><Bookmark className="h-4 w-4 text-emerald-500" /></div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Highest save-rate content</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">A {postFormat(topSaveShare.topSave)} post was saved {topSaveShare.topSave.saved}× ({(((topSaveShare.topSave.saved || 0) / (topSaveShare.topSave.reach || 1)) * 100).toFixed(2)}% of reach) — saves signal high value; repeat this topic.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best time + Format ER bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Clock className="h-4 w-4 text-indigo-600" /></div>
              Best Posting Window
              <InfoTip info={{ formula: "Best Day = weekday with highest avg ER. Best Time = hour with most followers online.", source: "media_metrics.posted_at (day) · audience_demographics (time)", validation: "Day uses publish-time IST; Time uses corrected online_followers (Pacific→IST)" }} />
              <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">IST</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-900/20 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Best Day (by engagement)</p>
              <p className="text-xl font-bold text-indigo-600">{bestDay?.label ?? "N/A"}</p>
              {bestDay && <EvidenceChips e={bestDay} />}
            </div>
            <div className="p-3 bg-amber-50/70 dark:bg-amber-900/20 rounded-xl">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Best Time (audience online)</p>
              <p className="text-xl font-bold text-amber-600">{audiencePeak?.label ?? bestHour?.label ?? "N/A"}</p>
              <p className="text-[10px] text-gray-400 mt-1">{audiencePeak ? "peak followers online" : "by historical engagement"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><BarChart3 className="h-4 w-4 text-emerald-600" /></div>
              Avg Engagement Rate by Format
              <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">ER = interactions ÷ reach</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-4 gap-3 h-32 items-end">
              {["Image", "Carousel", "Reel", "Video"].map(fmt => {
                const f = formatStats.find(s => s.format === fmt);
                const value = f?.avgER || 0;
                const color = fmt === "Reel" ? "from-pink-500 to-pink-400" : fmt === "Carousel" ? "from-indigo-500 to-indigo-400" : fmt === "Video" ? "from-amber-500 to-amber-400" : "from-emerald-500 to-emerald-400";
                return (
                  <div key={fmt} className="flex flex-col items-center gap-1">
                    <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-t-lg h-20 flex items-end overflow-hidden">
                      <div className={`w-full bg-gradient-to-t ${color} rounded-t-lg transition-all duration-700`} style={{ height: `${(value / maxFormatER) * 100}%`, minHeight: value > 0 ? "3px" : "0" }} />
                    </div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase">{fmt}</p>
                    <p className="text-xs font-bold text-gray-800 dark:text-white">{value.toFixed(2)}%</p>
                    <p className="text-[9px] text-gray-400">{f?.posts || 0} posts</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Posts & Engagement by Weekday — redesigned (Section 4) ────────── */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><BarChart3 className="h-4 w-4 text-indigo-600" /></div>
            Posts &amp; Engagement by Weekday
            <InfoTip info={{ formula: weekdayMode === "totals" ? "Posts = count; Engagement = Σ (likes+comments+shares+saves)" : "Avg Eng = mean interactions/post; Avg ER = mean (interactions ÷ reach)", source: "media_metrics.posted_at (IST)", validation: "Publish time converted UTC→IST (+5:30); buckets are mutually exclusive" }} />
            <div className="ml-auto flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {(["totals", "averages"] as WeekdayMode[]).map(m => (
                <button key={m} onClick={() => setWeekdayMode(m)}
                  className={cn("px-2.5 py-1 rounded-md text-[10px] font-semibold capitalize transition-colors", weekdayMode === m ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" : "text-gray-500")}>
                  {m}
                </button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <Bar
              data={{
                labels: weekday.map(w => dayShort(w.key)),
                datasets: weekdayMode === "totals" ? [
                  { label: "Posts (count)", data: weekday.map(w => w.posts), backgroundColor: "#6366f1", borderRadius: 4, yAxisID: "y" },
                  { label: "Total Engagement", data: weekday.map(w => w.totalEngagement), backgroundColor: "#ec4899", borderRadius: 4, yAxisID: "y1" },
                ] : [
                  { label: "Avg Engagement / post", data: weekday.map(w => Math.round(w.avgEngagement)), backgroundColor: "#6366f1", borderRadius: 4, yAxisID: "y" },
                  { label: "Avg ER (%)", data: weekday.map(w => parseFloat(w.avgER.toFixed(2))), backgroundColor: "#10b981", borderRadius: 4, yAxisID: "y1" },
                ],
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 }, color: "rgba(150,150,150,0.9)" } },
                  tooltip: { callbacks: { afterBody: (items: any) => `n = ${weekday[items[0].dataIndex].posts} posts` } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 10 } } },
                  y: { position: "left", grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "#6366f1", font: { size: 10 } }, title: { display: true, text: weekdayMode === "totals" ? "Posts" : "Avg Eng/post", color: "#6366f1", font: { size: 9 } } },
                  y1: { position: "right", grid: { display: false }, ticks: { color: weekdayMode === "totals" ? "#ec4899" : "#10b981", font: { size: 10 } }, title: { display: true, text: weekdayMode === "totals" ? "Total Engagement" : "Avg ER %", color: weekdayMode === "totals" ? "#ec4899" : "#10b981", font: { size: 9 } } },
                },
              } as any}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            <strong>Methodology:</strong> {weekdayMode === "totals"
              ? "Left axis = number of posts published that weekday. Right axis = total interactions those posts earned (sum)."
              : "Left axis = average interactions per post. Right axis = average engagement rate (interactions ÷ reach). Averages remove the bias of how many posts were published."}
            {" "}Each post counted once, by its IST publish day. Hover a bar for sample size.
          </p>
        </CardContent>
      </Card>

      {/* Posts by Hour */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Clock className="h-4 w-4 text-purple-600" /></div>
            Posts by Hour
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">IST · publish time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <Bar
              data={{ labels: Array.from({ length: 24 }, (_, h) => h), datasets: [{ label: "Posts", data: hourly.map(h => h.posts), backgroundColor: "#8b5cf6", borderRadius: 3 }] }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { title: (i: any) => `${i[0].label}:00 IST`, afterBody: (i: any) => `Avg ER ${hourly[i[0].dataIndex].avgER.toFixed(2)}%` } } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 9 }, maxTicksLimit: 12 } },
                  y: { grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 } } },
                },
              } as any}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top / Worst content table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700 flex-wrap">
          {([
            { key: "top" as Tab, label: "Top 20 Content", icon: TrendingUp, color: "text-emerald-600 border-emerald-500" },
            { key: "worst" as Tab, label: "Worst 20 Content", icon: ArrowDown, color: "text-rose-600 border-rose-500" },
          ]).map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => { setActiveTab(key); setSortKey("contentScore"); setSortDir(key === "top" ? "desc" : "asc"); }}
              className={cn("flex items-center gap-2 px-6 py-3.5 text-sm font-semibold border-b-2 transition-colors",
                activeTab === key ? `${color} bg-gray-50/50 dark:bg-gray-900/30` : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 px-4 text-xs text-gray-500">
            <span className="hidden sm:inline font-medium">Sort:</span>
            {SORT_COLS.map(({ key, label }) => (
              <button key={key} onClick={() => handleSort(key)}
                className={cn("px-2 py-1 rounded text-xs font-medium transition-colors", sortKey === key ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300")}>
                {label} {sortKey === key ? (sortDir === "desc" ? "↓" : "↑") : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-xs text-left min-w-[680px]">
            <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 w-14">Post</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Brand</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Date</th>
                <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Type</th>
                {SORT_COLS.map(({ key, label }) => (
                  <th key={key} className={cn("px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 text-right cursor-pointer select-none hover:text-indigo-600", sortKey === key && "text-indigo-600 dark:text-indigo-400")} onClick={() => handleSort(key)}>
                    <span className="flex items-center justify-end gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {displayedPosts.map((post) => {
                const engRate = postER(post).toFixed(2);
                const typeLabel = postFormat(post);
                const isReel = typeLabel === "Reel";
                const typeColor = isReel ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                  : typeLabel === "Carousel" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : typeLabel === "Video" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
                const isTop = activeTab === "top";
                return (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-2.5"><PostThumbnail src={post.media_url} permalink={post.permalink} mediaType={post.media_type} productType={post.media_product_type} size={48} /></td>
                    <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-gray-300 max-w-[80px] truncate">{getBrandName(post.brand_id)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(post.posted_at || post.created_at || "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${typeColor}`}>{typeLabel}</span></td>
                    <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isTop ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}`}>{post.contentScore.toFixed(1)}</span></td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{nf(post.reach || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{nf(post.like_count || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{nf(post.comments_count || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{nf(post.shares || 0)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{nf(post.saved || 0)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{engRate}%</td>
                  </tr>
                );
              })}
              {displayedPosts.length === 0 && (<tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">No posts found in this range.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
