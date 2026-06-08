"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useContentInsights } from "@/hooks/useContentInsights";
import { MediaPost, buildContentScorer, postFormat, postEngagement, postER, postViews } from "@/lib/content-insights";
import { InfoTip } from "@/components-v2/Evidence";
import { useMemo, useState } from "react";
import { AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Heart, MessageCircle, Share2, Bookmark, Eye, UserCheck, UserPlus, PlayCircle, Film, Image as ImageIcon, Layers, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type ScoredPost = MediaPost & { contentScore: number };
type SortKey = "contentScore" | "reach" | "views" | "engRate" | "like_count" | "comments_count" | "shares" | "saved" | "profile_visits" | "follows_from_content" | "watch_time" | "date";
type FormatFilter = "All" | "Reel" | "Carousel" | "Image" | "Video";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "contentScore", label: "Content Score" },
  { key: "date", label: "Date" },
  { key: "reach", label: "Reach" },
  { key: "views", label: "Views" },
  { key: "engRate", label: "Engagement Rate" },
  { key: "like_count", label: "Likes" },
  { key: "comments_count", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "saved", label: "Saves" },
  { key: "profile_visits", label: "Profile Visits" },
  { key: "follows_from_content", label: "Follows" },
  { key: "watch_time", label: "Watch Time" },
];

const fmtDuration = (ms: number) => {
  if (!ms || ms <= 0) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(1)} hrs`;
};
const nf = (n: number | null | undefined) => (n || 0).toLocaleString();

// ── Instagram-style card image with graceful fallback ────────────────────────
function CardImage({ post }: { post: ScoredPost }) {
  // Resolve fresh via the proxy (handles reels' video media_url + URL expiry).
  const imgSrc = post.media_id ? `/api/ig-image?id=${encodeURIComponent(post.media_id)}` : post.media_url;
  const [state, setState] = useState<"loading" | "ok" | "error">(imgSrc ? "loading" : "error");
  const f = postFormat(post);
  const { Icon, bg, fg } = f === "Reel" ? { Icon: Film, bg: "bg-pink-100 dark:bg-pink-900/30", fg: "text-pink-400" }
    : f === "Carousel" ? { Icon: Layers, bg: "bg-indigo-100 dark:bg-indigo-900/30", fg: "text-indigo-400" }
    : f === "Video" ? { Icon: Video, bg: "bg-amber-100 dark:bg-amber-900/30", fg: "text-amber-400" }
    : { Icon: ImageIcon, bg: "bg-emerald-100 dark:bg-emerald-900/30", fg: "text-emerald-400" };
  const scoreColor = post.contentScore >= 60 ? "bg-emerald-500" : post.contentScore >= 35 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-900 group/img">
      {state !== "ok" && (
        <div className={`absolute inset-0 flex items-center justify-center ${bg}`}>
          {state === "loading" ? <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <Icon className={`h-9 w-9 ${fg}`} />}
        </div>
      )}
      {imgSrc && state !== "error" && (
        <img src={imgSrc} alt={f} referrerPolicy="no-referrer" loading="lazy"
          className="w-full h-full object-cover" style={{ opacity: state === "ok" ? 1 : 0 }}
          onLoad={() => setState("ok")} onError={() => setState("error")} />
      )}
      {/* format badge */}
      <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">{f}</span>
      {/* content score badge */}
      <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold text-white ${scoreColor}`} title="Content Score (0–100)">{post.contentScore.toFixed(0)}</span>
      {/* open on IG */}
      {(post.permalink || post.media_url) && (
        <a href={post.permalink || post.media_url || "#"} target="_blank" rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity" title="Open on Instagram">
          <ExternalLink className="h-5 w-5 text-white" />
        </a>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, na }: { icon: any; label: string; value: string; na?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" title={label}>
      <Icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
      <span className={cn("text-[11px] font-medium", na ? "text-gray-300 dark:text-gray-600" : "text-gray-700 dark:text-gray-300")}>{na ? "N/A" : value}</span>
    </div>
  );
}

export default function V2ContentLibrary() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const { posts, postsAnalyzed, loading } = useContentInsights(selectedBrandIds, { start: dateRange.start, end: dateRange.end });

  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("contentScore");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [visible, setVisible] = useState(48);

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || "Unknown";

  const scored: ScoredPost[] = useMemo(() => {
    const score = buildContentScorer(posts);
    return posts.map(p => ({ ...p, contentScore: score(p) }));
  }, [posts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = scored.filter(p => formatFilter === "All" || postFormat(p) === formatFilter);
    if (q) arr = arr.filter(p => (p.caption || "").toLowerCase().includes(q) || getBrandName(p.brand_id).toLowerCase().includes(q));
    const val = (p: ScoredPost): number | string => {
      switch (sortKey) {
        case "engRate": return postER(p);
        case "views": return postViews(p);
        case "date": return p.posted_at || p.created_at || "";
        case "watch_time": return p.watch_time || 0;
        default: return (p[sortKey] as number) || 0;
      }
    };
    return [...arr].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === "string" || typeof vb === "string") return sortDir === "desc" ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
      return sortDir === "desc" ? vb - va : va - vb;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scored, search, formatFilter, sortKey, sortDir, brands]);

  const shown = filtered.slice(0, visible);

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Library</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-500/80">Select at least one brand to browse content.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading Content Library…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Library</h2>
          <InfoTip info={{ formula: "Every post published in the range. Content Score = ER 40% + Reach 30% + Virality 20% + Activation 10% (0–100).", source: "media_metrics", validation: "Profile Visits & Follows are N/A for Reels (Meta does not return them)" }} />
        </div>
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-full">{dateRange.label} · {postsAnalyzed} posts</span>
      </div>

      {/* Controls: search / filter / sort */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setVisible(48); }}
            placeholder="Search caption or brand…"
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1">
          {(["All", "Reel", "Carousel", "Image", "Video"] as FormatFilter[]).map(f => (
            <button key={f} onClick={() => { setFormatFilter(f); setVisible(48); }}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors", formatFilter === f ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200")}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
            {SORTS.map(s => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
          </select>
          <button onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-indigo-600" title={sortDir === "desc" ? "Descending" : "Ascending"}>
            {sortDir === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">Showing {shown.length} of {filtered.length} posts{formatFilter !== "All" ? ` · ${formatFilter}` : ""}{search ? ` · matching “${search}”` : ""}</p>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No posts match your filters.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shown.map(post => {
            const f = postFormat(post);
            const isReel = f === "Reel";
            const dateStr = post.posted_at || post.created_at;
            return (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                <CardImage post={post} />
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {/* brand + date */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{getBrandName(post.brand_id)}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>
                  </div>
                  {/* caption */}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 min-h-[2.4em]">{post.caption || <span className="italic text-gray-300 dark:text-gray-600">No caption</span>}</p>
                  {/* primary stats */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700/60">
                    <div className="text-center"><p className="text-sm font-bold text-gray-900 dark:text-white">{nf(post.reach)}</p><p className="text-[9px] text-gray-400 uppercase tracking-wide">Reach</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-gray-900 dark:text-white">{postViews(post) > 0 ? nf(postViews(post)) : "—"}</p><p className="text-[9px] text-gray-400 uppercase tracking-wide">Views</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{postER(post).toFixed(1)}%</p><p className="text-[9px] text-gray-400 uppercase tracking-wide">Eng. Rate</p></div>
                  </div>
                  {/* secondary stats */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                    <Stat icon={Heart} label="Likes" value={nf(post.like_count)} />
                    <Stat icon={MessageCircle} label="Comments" value={nf(post.comments_count)} />
                    <Stat icon={Share2} label="Shares" value={nf(post.shares)} />
                    <Stat icon={Bookmark} label="Saves" value={nf(post.saved)} />
                    <Stat icon={UserCheck} label="Profile Visits" value={nf(post.profile_visits)} na={isReel} />
                    <Stat icon={UserPlus} label="Follows Generated" value={nf(post.follows_from_content)} na={isReel} />
                    {isReel && <Stat icon={PlayCircle} label="Watch Time (total)" value={fmtDuration(post.watch_time || 0)} />}
                    {isReel && <Stat icon={Eye} label="Avg Watch Time" value={post.avg_watch_time ? `${((post.avg_watch_time || 0) / 1000).toFixed(1)}s` : "—"} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visible < filtered.length && (
        <div className="flex justify-center pt-2">
          <button onClick={() => setVisible(v => v + 48)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
            Load more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}

      <p className="text-[10px] text-gray-400 pt-2">
        <strong>Note:</strong> Meta does not provide post-level follower attribution for Reels — <strong>Profile Visits</strong> and <strong>Follows Generated</strong> show <strong>N/A</strong> on Reels (they are only returned for feed posts &amp; carousels). Thumbnails load from Instagram&apos;s CDN and may fall back to a format icon when the signed URL has expired; click any card to open the original post.
      </p>
    </div>
  );
}
