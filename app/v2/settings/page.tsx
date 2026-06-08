"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { Database, RefreshCw, Download, CheckCircle, AlertCircle, Activity, History, ToggleLeft, ToggleRight, Clock, Play, RotateCw, ListChecks, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type BackfillState = "idle" | "running" | "done" | "error";
type BrandState = "idle" | "syncing" | "success" | "error";
const AUTO_SYNC_KEY = "mafatlal-auto-sync";
const SYNC_LOG_KEY = "mafatlal-sync-log-v1";
const FANOUT_CONCURRENCY = 3; // brands synced in parallel from the client

interface BrandRow {
  id: string;
  brand_name: string;
  lastSync: string | null;        // metric_date (date of latest daily_metrics row)
}
interface BrandStatus {
  state: BrandState;
  records?: number;
  durationMs?: number;
  error?: string | null;
  at?: string;                    // ISO timestamp of last attempt
}
interface LogEntry {
  brand_name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  records: number;
  status: "success" | "error";
  error?: string | null;
}

export default function V2Settings() {
  const { dateRange } = useDateRange();
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, BrandStatus>>({});
  const [syncingAll, setSyncingAll] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [backfillState, setBackfillState] = useState<BackfillState>("idle");
  const [backfillMsg, setBackfillMsg] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [exporting, setExporting] = useState<"daily" | "media" | null>(null);

  const loadBrands = useCallback(async () => {
    const { data: brandsData } = await supabase.from("brands").select("id, brand_name").order("brand_name");
    const { data: lastSyncData } = await supabase
      .from("daily_metrics").select("brand_id, metric_date").order("metric_date", { ascending: false });
    const latestByBrand: Record<string, string> = {};
    lastSyncData?.forEach(r => { if (!latestByBrand[r.brand_id]) latestByBrand[r.brand_id] = r.metric_date; });
    setBrands((brandsData || []).map(b => ({ id: b.id, brand_name: b.brand_name, lastSync: latestByBrand[b.id] || null })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBrands();
    try { setAutoSync(localStorage.getItem(AUTO_SYNC_KEY) === "true"); } catch {}
    // Load sync history: prefer persisted DB table, fall back to localStorage.
    (async () => {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("brand_name, started_at, finished_at, duration_ms, records, status, error")
        .order("started_at", { ascending: false })
        .limit(30);
      if (!error && data) {
        setLog(data as LogEntry[]);
      } else {
        try { const raw = localStorage.getItem(SYNC_LOG_KEY); if (raw) setLog(JSON.parse(raw)); } catch {}
      }
    })();
  }, [loadBrands]);

  function pushLog(entry: LogEntry) {
    setLog(prev => {
      const next = [entry, ...prev].slice(0, 50);
      try { localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  // Sync ONE brand via its own request/function invocation (the timeout fix).
  const syncOne = useCallback(async (brand: BrandRow): Promise<boolean> => {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    setStatus(s => ({ ...s, [brand.id]: { state: "syncing", at: startedAt } }));
    try {
      const res = await fetch(`/api/sync/metrics?brand_id=${brand.id}`);
      const json = await res.json();
      const r = json?.data?.results?.[0];
      const ok = !!json?.success && r?.status === "success";
      const durationMs = r?.duration_ms ?? (Date.now() - t0);
      const finishedAt = new Date().toISOString();
      const records = r?.records ?? 0;
      const error = ok ? null : (r?.error || json?.error || "Unknown error");
      setStatus(s => ({ ...s, [brand.id]: { state: ok ? "success" : "error", records, durationMs, error, at: finishedAt } }));
      pushLog({ brand_name: brand.brand_name, started_at: startedAt, finished_at: finishedAt, duration_ms: durationMs, records, status: ok ? "success" : "error", error });
      return ok;
    } catch (e: any) {
      const finishedAt = new Date().toISOString();
      setStatus(s => ({ ...s, [brand.id]: { state: "error", error: e.message, durationMs: Date.now() - t0, at: finishedAt } }));
      pushLog({ brand_name: brand.brand_name, started_at: startedAt, finished_at: finishedAt, duration_ms: Date.now() - t0, records: 0, status: "error", error: e.message });
      return false;
    }
  }, []);

  // Sync ALL brands as independent requests with bounded concurrency.
  async function syncAll() {
    setSyncingAll(true);
    setProgress({ done: 0, total: brands.length });
    const queue = [...brands];
    let done = 0;
    const worker = async () => {
      while (queue.length) {
        const b = queue.shift()!;
        await syncOne(b);
        done++; setProgress({ done, total: brands.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(FANOUT_CONCURRENCY, brands.length) }, worker));
    setSyncingAll(false);
    await loadBrands(); // refresh last-sync dates
  }

  async function retryOne(brand: BrandRow) {
    await syncOne(brand);
    await loadBrands();
  }

  function toggleAutoSync() {
    const next = !autoSync; setAutoSync(next);
    try { localStorage.setItem(AUTO_SYNC_KEY, String(next)); } catch {}
  }

  async function handleBackfill() {
    setBackfillState("running"); setBackfillMsg("");
    try {
      const res = await fetch("/api/sync/backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: 30 }) });
      const json = await res.json();
      if (json.success) { setBackfillState("done"); setBackfillMsg("Backfill complete. Reload the dashboard to see historical data."); }
      else { setBackfillState("error"); setBackfillMsg(json.error || "Backfill failed."); }
    } catch (e: any) { setBackfillState("error"); setBackfillMsg(e.message || "Network error"); }
    setTimeout(() => setBackfillState("idle"), 8000);
  }

  async function exportCSV(table: "daily_metrics" | "media_metrics") {
    setExporting(table === "daily_metrics" ? "daily" : "media");
    const { data } = await supabase.from(table).select("*")
      .gte(table === "daily_metrics" ? "metric_date" : "created_at", dateRange.start)
      .lte(table === "daily_metrics" ? "metric_date" : "created_at", dateRange.end);
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${table}_${dateRange.start}_to_${dateRange.end}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(null);
  }

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const fmtDur = (ms?: number) => ms == null ? "—" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const StatusBadge = ({ st }: { st?: BrandStatus }) => {
    if (st?.state === "syncing") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"><RefreshCw className="h-3 w-3 animate-spin" />Syncing…</span>;
    if (st?.state === "success") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"><CheckCircle className="h-3 w-3" />Synced {st.records != null ? `· ${st.records}` : ""}</span>;
    if (st?.state === "error") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400" title={st.error || ""}><XCircle className="h-3 w-3" />Failed</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">Active</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      {/* Connected Brands */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Database className="h-4 w-4 text-indigo-600" /></div>
            Connected Brands
          </CardTitle>
          <Button onClick={syncAll} disabled={syncingAll} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", syncingAll && "animate-spin")} />
            {syncingAll ? `Syncing ${progress?.done ?? 0}/${progress?.total ?? brands.length}…` : "Sync All Brands"}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-24"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Brand Name</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Meta Connected</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Last Sync</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {brands.map(b => {
                    const st = status[b.id];
                    const failed = st?.state === "error";
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{b.brand_name}</td>
                        <td className="px-6 py-3"><span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle className="h-3.5 w-3.5" /> Connected</span></td>
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                          {st?.state === "success" && st.at ? <span className="text-emerald-600">just now · {fmtDur(st.durationMs)}</span>
                            : fmtDate(b.lastSync) || <span className="text-amber-500">No data yet</span>}
                        </td>
                        <td className="px-6 py-3"><StatusBadge st={st} /></td>
                        <td className="px-6 py-3 text-right">
                          <Button size="sm" variant={failed ? "default" : "outline"} onClick={() => retryOne(b)} disabled={st?.state === "syncing" || syncingAll}
                            className={cn("gap-1.5 h-8 text-xs", failed && "bg-rose-600 hover:bg-rose-700")}>
                            {st?.state === "syncing" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : failed ? <RotateCw className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {st?.state === "syncing" ? "Syncing" : failed ? "Retry" : "Sync Now"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-gray-400 px-6 py-3 border-t border-gray-50 dark:border-gray-800">
            Each brand syncs as an independent request (max {FANOUT_CONCURRENCY} in parallel), so a single slow brand can never time out the whole portfolio. Retry an individual brand without re-running the others.
          </p>
        </CardContent>
      </Card>

      {/* Sync Activity Log */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><ListChecks className="h-4 w-4 text-purple-600" /></div>
            Sync Activity Log
            <span className="ml-auto text-[10px] font-medium text-gray-400 normal-case">{log.length ? `last ${log.length} runs` : "no runs yet"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {log.length === 0 ? (
            <p className="text-sm text-gray-400 px-6 py-6">No sync activity yet. Run a sync to populate the log (brand, start, completion, records, and any failure reason).</p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800 sticky top-0">
                  <tr>
                    <th className="px-6 py-2.5 font-bold text-gray-700 dark:text-gray-300">Brand</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Started</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Completed</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 text-right">Duration</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300 text-right">Records</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-2.5 font-bold text-gray-700 dark:text-gray-300">Failure Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {log.map((e, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{e.brand_name}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(e.started_at)}</td>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(e.finished_at)}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{fmtDur(e.duration_ms)}</td>
                      <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{e.records}</td>
                      <td className="px-4 py-2">
                        {e.status === "success"
                          ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle className="h-3 w-3" />Success</span>
                          : <span className="inline-flex items-center gap-1 text-rose-600"><XCircle className="h-3 w-3" />Error</span>}
                      </td>
                      <td className="px-4 py-2 text-rose-500 max-w-[220px] truncate" title={e.error || ""}>{e.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls (auto + backfill) */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><RefreshCw className="h-4 w-4 text-emerald-600" /></div>
            Sync Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Sync</p>
                <p className="text-xs text-gray-400">Automatically sync every 24 hours</p>
              </div>
            </div>
            <button onClick={toggleAutoSync} className="transition-colors">
              {autoSync ? <ToggleRight className="h-7 w-7 text-indigo-600" /> : <ToggleLeft className="h-7 w-7 text-gray-400" />}
            </button>
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Pipeline syncs daily automatically</span>
            {autoSync && <span className="flex items-center gap-1 text-indigo-400"><CheckCircle className="h-3 w-3" /> Auto sync enabled</span>}
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><History className="h-4 w-4 text-indigo-500" />Backfill Historical Data</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Fetch up to 30 days of historical reach and impressions from Meta API. Note: follower counts cannot be backfilled (Meta API limitation).</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={handleBackfill} disabled={backfillState === "running"} className="gap-2 text-sm">
                {backfillState === "running" && <RefreshCw className="h-4 w-4 animate-spin" />}
                {backfillState === "done" && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                {backfillState === "error" && <AlertCircle className="h-4 w-4 text-rose-600" />}
                {(backfillState === "idle") && <History className="h-4 w-4" />}
                {backfillState === "running" ? "Backfilling…" : backfillState === "done" ? "Backfill Complete" : backfillState === "error" ? "Backfill Failed" : "Backfill 30 Days"}
              </Button>
              {backfillMsg && <span className={cn("text-xs max-w-xs", backfillState === "done" ? "text-emerald-600" : "text-rose-600")}>{backfillMsg}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Download className="h-4 w-4 text-blue-600" /></div>
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Export data as CSV for the selected date range: <strong>{dateRange.label}</strong>.</p>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => exportCSV("daily_metrics")} disabled={exporting === "daily"} className="gap-2 text-sm">
              {exporting === "daily" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Daily Metrics CSV
            </Button>
            <Button variant="outline" onClick={() => exportCSV("media_metrics")} disabled={exporting === "media"} className="gap-2 text-sm">
              {exporting === "media" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Media Metrics CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
