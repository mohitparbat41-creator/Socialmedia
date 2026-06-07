-- ════════════════════════════════════════════════════════════════════
-- Migration 001 — Meta Data Expansion (account-level + content-level)
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS guards).
-- All columns nullable so existing rows are unaffected; the sync backfills.
-- ════════════════════════════════════════════════════════════════════

-- ── Account-level metrics → daily_metrics ──────────────────────────────
-- (reach + profile_views already exist; these are the confirmed-available adds)
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS views                bigint;  -- "views" metric (impressions replacement)
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS accounts_engaged     bigint;  -- accounts_engaged (total_value)
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS accounts_reached     bigint;  -- reach as accounts (= account reach)
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS website_clicks       integer; -- profile_links_taps breakdown
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS email_clicks         integer;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS call_clicks          integer;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS text_message_clicks  integer;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS direction_clicks     integer;
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS new_followers        integer; -- follows_and_unfollows breakdown
ALTER TABLE daily_metrics ADD COLUMN IF NOT EXISTS unfollows            integer;

-- ── Content-level metrics → media_metrics ──────────────────────────────
-- (video_views, plays already exist)
ALTER TABLE media_metrics ADD COLUMN IF NOT EXISTS watch_time           bigint;  -- ig_reels_video_view_total_time (ms)
ALTER TABLE media_metrics ADD COLUMN IF NOT EXISTS avg_watch_time       bigint;  -- ig_reels_avg_watch_time (ms)
ALTER TABLE media_metrics ADD COLUMN IF NOT EXISTS profile_visits       integer; -- per-post profile_visits (images)
ALTER TABLE media_metrics ADD COLUMN IF NOT EXISTS follows_from_content integer; -- per-post follows (images)

-- ── Indexes to keep date-range + brand queries fast at scale ───────────
CREATE INDEX IF NOT EXISTS idx_daily_metrics_brand_date  ON daily_metrics (brand_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_media_metrics_brand_posted ON media_metrics (brand_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_media_metrics_posted       ON media_metrics (posted_at);

-- ── Verify ─────────────────────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'daily_metrics' ORDER BY ordinal_position;
