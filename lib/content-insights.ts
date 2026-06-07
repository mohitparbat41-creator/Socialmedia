/**
 * Shared content-analytics engine.
 *
 * One source of truth for format/day/hour breakdowns, the per-post Content Score,
 * and evidence-backed "best X" recommendations (sample size + confidence +
 * statistical significance). Consumed by the Executive dashboard, Content
 * Intelligence, and the Content Library so the numbers never diverge.
 *
 * Timezone note: `posted_at` is a real UTC timestamp → converted to IST (+5:30)
 * for day/hour bucketing. (This is unrelated to `online_followers`, which Meta
 * returns in Pacific time — handled separately in lib/meta-service.ts.)
 */

export interface MediaPost {
  id: string;
  brand_id: string;
  media_id: string;
  media_type: string;            // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_product_type: string;    // FEED | REELS
  caption: string | null;
  media_url: string | null;
  permalink: string | null;
  posted_at: string | null;
  created_at?: string | null;
  like_count: number | null;
  comments_count: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  plays: number | null;
  video_views: number | null;
  total_interactions: number | null;
  watch_time: number | null;       // milliseconds (total)
  avg_watch_time: number | null;   // milliseconds (per view)
  profile_visits: number | null;   // null for Reels (Meta limitation)
  follows_from_content: number | null; // null for Reels (Meta limitation)
}

export type ContentFormat = "Reel" | "Image" | "Carousel" | "Video";
export const FORMATS: ContentFormat[] = ["Reel", "Image", "Carousel", "Video"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── primitives ──────────────────────────────────────────────────────────────
export function postFormat(p: MediaPost): ContentFormat {
  if (p.media_product_type === "REELS") return "Reel";
  if (p.media_type === "CAROUSEL_ALBUM") return "Carousel";
  if (p.media_type === "VIDEO") return "Video";
  return "Image";
}

/** Interactions = likes + comments + shares + saves (Meta's engagement basis). */
export function postEngagement(p: MediaPost): number {
  return (p.like_count || 0) + (p.comments_count || 0) + (p.shares || 0) + (p.saved || 0);
}

/** Engagement Rate (%) = interactions ÷ reach × 100. */
export function postER(p: MediaPost): number {
  const r = p.reach || 0;
  return r > 0 ? (postEngagement(p) / r) * 100 : 0;
}

/** Post-level "views": Reels/Video use plays/video_views; static media have none. */
export function postViews(p: MediaPost): number {
  return p.video_views || p.plays || 0;
}

/** Convert a UTC ISO timestamp to IST weekday + hour (deterministic, TZ-independent). */
export function istParts(iso: string | null): { day: number; hour: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ist = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
  return { day: ist.getUTCDay(), hour: ist.getUTCHours() };
}

export const dayName = (d: number) => DAY_NAMES[d] ?? "—";
export const dayShort = (d: number) => DAY_SHORT[d] ?? "—";
export const fmtHour12 = (h: number) => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;

// ── format breakdown (Section 4) ─────────────────────────────────────────────
export interface FormatStat {
  format: ContentFormat;
  posts: number;
  reach: number;
  engagement: number;
  avgER: number;            // average per-post ER (%)
  saves: number;
  shares: number;
  profileVisits: number;
  follows: number;
  views: number;
  watchHours: number;       // total watch time (hours)
  avgWatchSec: number;      // average per-view watch time (seconds)
  profileVisitsAvailable: boolean; // false when format never reports it (Reels)
}

export function formatBreakdown(posts: MediaPost[]): FormatStat[] {
  const map = new Map<ContentFormat, MediaPost[]>();
  for (const p of posts) {
    const f = postFormat(p);
    if (!map.has(f)) map.set(f, []);
    map.get(f)!.push(p);
  }
  const out: FormatStat[] = [];
  for (const [format, rows] of map) {
    const reach = sum(rows, r => r.reach || 0);
    const engagement = sum(rows, postEngagement);
    const erVals = rows.map(postER);
    const watchMs = sum(rows, r => r.watch_time || 0);
    const avgWatchVals = rows.filter(r => (r.avg_watch_time || 0) > 0).map(r => r.avg_watch_time || 0);
    const pvVals = rows.filter(r => r.profile_visits != null);
    out.push({
      format,
      posts: rows.length,
      reach,
      engagement,
      avgER: mean(erVals),
      saves: sum(rows, r => r.saved || 0),
      shares: sum(rows, r => r.shares || 0),
      profileVisits: sum(rows, r => r.profile_visits || 0),
      follows: sum(rows, r => r.follows_from_content || 0),
      views: sum(rows, postViews),
      watchHours: watchMs / 3_600_000,
      avgWatchSec: avgWatchVals.length ? mean(avgWatchVals) / 1000 : 0,
      profileVisitsAvailable: pvVals.length > 0,
    });
  }
  return out.sort((a, b) => b.posts - a.posts);
}

// ── weekday / hour breakdown (Section 4 redesign + Section 2 evidence) ────────
export interface BucketStat {
  key: number;              // weekday 0-6 or hour 0-23
  label: string;
  posts: number;            // SAMPLE SIZE
  totalEngagement: number;  // SUM of interactions
  avgEngagement: number;    // MEAN interactions per post
  avgER: number;            // MEAN engagement rate (%)
  totalReach: number;
}

function bucketize(posts: MediaPost[], keyFn: (p: MediaPost) => number | null, labelFn: (k: number) => string, size: number): BucketStat[] {
  const buckets: { posts: MediaPost[] }[] = Array.from({ length: size }, () => ({ posts: [] }));
  for (const p of posts) {
    const k = keyFn(p);
    if (k == null || k < 0 || k >= size) continue;
    buckets[k].posts.push(p);
  }
  return buckets.map((b, key) => ({
    key,
    label: labelFn(key),
    posts: b.posts.length,
    totalEngagement: sum(b.posts, postEngagement),
    avgEngagement: mean(b.posts.map(postEngagement)),
    avgER: mean(b.posts.map(postER)),
    totalReach: sum(b.posts, r => r.reach || 0),
  }));
}

export const weekdayBreakdown = (posts: MediaPost[]): BucketStat[] =>
  bucketize(posts, p => istParts(p.posted_at || p.created_at || null)?.day ?? null, dayName, 7);

export const hourBreakdown = (posts: MediaPost[]): BucketStat[] =>
  bucketize(posts, p => istParts(p.posted_at || p.created_at || null)?.hour ?? null, fmtHour12, 24);

// ── Content Score (Section 5) ────────────────────────────────────────────────
/**
 * Builds a 0–100 scorer normalized against the supplied dataset. Weights:
 *   Engagement Rate 40% · Reach 30% · Virality 20% · Activation 10%
 * Each component is min-max normalized against the dataset's 90th-percentile
 * value (capped at 1) so a few outliers don't crush every other score.
 * Watch time is reported separately (not scored) to keep one formula across formats.
 */
export function buildContentScorer(posts: MediaPost[]): (p: MediaPost) => number {
  const erP90 = pct(posts.map(postER), 90) || 1;
  const reachP90 = pct(posts.map(p => p.reach || 0), 90) || 1;
  const viralP90 = pct(posts.map(viralityRate), 90) || 1;
  const activP90 = pct(posts.map(activationRate), 90) || 1;
  const n = (x: number, p90: number) => Math.max(0, Math.min(1, x / p90));
  return (p: MediaPost) => {
    const score = 100 * (
      0.40 * n(postER(p), erP90) +
      0.30 * n(p.reach || 0, reachP90) +
      0.20 * n(viralityRate(p), viralP90) +
      0.10 * n(activationRate(p), activP90)
    );
    return Math.round(score * 10) / 10;
  };
}
const viralityRate = (p: MediaPost) => (p.reach || 0) > 0 ? ((p.shares || 0) + (p.saved || 0)) / (p.reach || 1) : 0;
const activationRate = (p: MediaPost) => (p.reach || 0) > 0 ? ((p.profile_visits || 0) + (p.follows_from_content || 0)) / (p.reach || 1) : 0;

/** Portfolio Content ROI Score = mean Content Score across all posts (0–100). */
export function contentRoiScore(posts: MediaPost[]): number {
  if (!posts.length) return 0;
  const score = buildContentScorer(posts);
  return Math.round(mean(posts.map(score)) * 10) / 10;
}

// ── evidence-backed recommendations (Sections 1 & 2) ─────────────────────────
export interface Evidence {
  label: string;            // e.g. "Friday" or "9 PM" or "Reel"
  metric: number;           // the winning bucket's mean ER (%)
  sampleSize: number;       // posts in the winning bucket
  totalAnalyzed: number;    // posts across all buckets
  liftPct: number;          // % lift of winner vs overall mean
  confidence: number;       // 0–100 heuristic
  confidenceLabel: "High" | "Medium" | "Low";
  significant: boolean;     // Welch t-test |t| > 1.96 (≈ p<0.05) vs the rest
  pLabel: string;           // "p < 0.05 (significant)" | "not significant"
  tStat: number;
}

/** Welch's two-sample t comparing a bucket's per-post ER vs everything else. */
function welch(bucket: number[], rest: number[]): { t: number; significant: boolean } {
  if (bucket.length < 2 || rest.length < 2) return { t: 0, significant: false };
  const v = (a: number[], m: number) => a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1);
  const m1 = mean(bucket), m2 = mean(rest);
  const se = Math.sqrt(v(bucket, m1) / bucket.length + v(rest, m2) / rest.length);
  if (se === 0) return { t: 0, significant: false };
  const t = (m1 - m2) / se;
  return { t, significant: Math.abs(t) > 1.96 };
}

/** Best weekday by mean ER, with evidence. minSample guards tiny buckets. */
export function bestDay(posts: MediaPost[], minSample = 3): Evidence | null {
  return bestBucket(posts, p => istParts(p.posted_at || p.created_at || null)?.day ?? null, dayName, minSample);
}
/** Best posting hour by mean ER, with evidence. */
export function bestHour(posts: MediaPost[], minSample = 3): Evidence | null {
  return bestBucket(posts, p => istParts(p.posted_at || p.created_at || null)?.hour ?? null, fmtHour12, minSample);
}
/** Best format by mean ER, with evidence. */
export function bestFormat(posts: MediaPost[], minSample = 3): Evidence | null {
  return bestBucket(posts, p => FORMATS.indexOf(postFormat(p)), i => FORMATS[i], minSample);
}

function bestBucket(posts: MediaPost[], keyFn: (p: MediaPost) => number | null, labelFn: (k: number) => string, minSample: number): Evidence | null {
  const groups = new Map<number, number[]>(); // key → ER list
  const allERs: number[] = [];
  for (const p of posts) {
    const k = keyFn(p);
    if (k == null || k < 0) continue;
    const er = postER(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(er);
    allERs.push(er);
  }
  let best: { key: number; ers: number[] } | null = null;
  for (const [key, ers] of groups) {
    if (ers.length < minSample) continue;
    if (!best || mean(ers) > mean(best.ers)) best = { key, ers };
  }
  if (!best) return null;
  const rest = subtractMultiset(allERs, best.ers);
  const overall = mean(allERs);
  const metric = mean(best.ers);
  const { t, significant } = welch(best.ers, rest);
  const liftPct = overall > 0 ? ((metric - overall) / overall) * 100 : 0;
  // Confidence = geometric mean of sample adequacy (n→15) and effect strength
  // (|t|→3), so BOTH must be strong to score high. Label additionally requires
  // statistical significance for "High" — avoids "High confidence + not significant".
  const sampleScore = Math.min(1, best.ers.length / 15);
  const effectScore = Math.min(1, Math.abs(t) / 3);
  const confidence = Math.round(100 * Math.sqrt(sampleScore * effectScore));
  const adequate = best.ers.length >= 15;
  const confidenceLabel: Evidence["confidenceLabel"] =
    (significant && adequate) ? "High" : (significant || adequate) ? "Medium" : "Low";
  return {
    label: labelFn(best.key),
    metric, sampleSize: best.ers.length, totalAnalyzed: allERs.length,
    liftPct, confidence, confidenceLabel, significant,
    pLabel: significant ? "p < 0.05 (significant)" : "not statistically significant",
    tStat: Math.round(t * 100) / 100,
  };
}

// ── small stats helpers ──────────────────────────────────────────────────────
function sum<T>(arr: T[], f: (x: T) => number): number { return arr.reduce((s, x) => s + f(x), 0); }
function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function pct(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}
/** Remove the multiset `take` from `from` (used to build the "rest" group). */
function subtractMultiset(from: number[], take: number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of take) counts.set(x, (counts.get(x) || 0) + 1);
  const out: number[] = [];
  for (const x of from) {
    const c = counts.get(x) || 0;
    if (c > 0) counts.set(x, c - 1); else out.push(x);
  }
  return out;
}
