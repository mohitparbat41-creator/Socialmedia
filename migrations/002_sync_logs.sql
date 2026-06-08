-- ════════════════════════════════════════════════════════════════════
-- Migration 002 — Sync Logs (per-brand sync audit trail)
-- Run in Supabase SQL Editor. Safe to re-run (IF NOT EXISTS guards).
-- OPTIONAL: the Settings → Sync Activity panel works from the live API
-- response without this table; the table adds cross-session history.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sync_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brand_id    uuid REFERENCES brands(id) ON DELETE CASCADE,
  brand_name  text,
  started_at  timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  records     integer,
  status      text,          -- 'success' | 'error'
  error       text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON sync_logs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_brand   ON sync_logs (brand_id, started_at DESC);

-- Match the dashboard's anon-key access model (read + insert from the app).
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sync_logs_select ON sync_logs;
CREATE POLICY sync_logs_select ON sync_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS sync_logs_insert ON sync_logs;
CREATE POLICY sync_logs_insert ON sync_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
