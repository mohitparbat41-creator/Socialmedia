"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { Settings, Database, RefreshCw, Download, CheckCircle, AlertCircle, Activity, History, ToggleLeft, ToggleRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncState = "idle" | "syncing" | "success" | "error";
type BackfillState = "idle" | "running" | "done" | "error";
const AUTO_SYNC_KEY = "mafatlal-auto-sync";

interface BrandSyncRow {
  id: string;
  brand_name: string;
  lastSync: string | null;
  status: "connected" | "no-data";
}

export default function V2Settings() {
  const { dateRange } = useDateRange();
  const [brands, setBrands] = useState<BrandSyncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMsg, setSyncMsg] = useState("");
  const [backfillState, setBackfillState] = useState<BackfillState>("idle");
  const [backfillMsg, setBackfillMsg] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [exporting, setExporting] = useState<"daily" | "media" | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: brandsData } = await supabase.from("brands").select("id, brand_name");
      const { data: lastSyncData } = await supabase
        .from("daily_metrics")
        .select("brand_id, metric_date")
        .order("metric_date", { ascending: false });

      const latestByBrand: Record<string, string> = {};
      lastSyncData?.forEach(r => {
        if (!latestByBrand[r.brand_id]) latestByBrand[r.brand_id] = r.metric_date;
      });

      setBrands(
        (brandsData || []).map(b => ({
          id: b.id,
          brand_name: b.brand_name,
          lastSync: latestByBrand[b.id] || null,
          status: latestByBrand[b.id] ? "connected" : "no-data",
        }))
      );
      setLoading(false);
    }
    load();
    try { setAutoSync(localStorage.getItem(AUTO_SYNC_KEY) === "true"); } catch {}
  }, []);

  function toggleAutoSync() {
    const next = !autoSync;
    setAutoSync(next);
    try { localStorage.setItem(AUTO_SYNC_KEY, String(next)); } catch {}
  }

  async function handleBackfill() {
    setBackfillState("running");
    setBackfillMsg("");
    try {
      const res = await fetch("/api/sync/backfill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: 30 }) });
      const json = await res.json();
      if (json.success) {
        setBackfillState("done");
        setBackfillMsg("Backfill complete. Reload the dashboard to see historical data.");
      } else {
        setBackfillState("error");
        setBackfillMsg(json.error || "Backfill failed.");
      }
    } catch (e: any) {
      setBackfillState("error");
      setBackfillMsg(e.message || "Network error");
    }
    setTimeout(() => setBackfillState("idle"), 8000);
  }

  async function handleSync() {
    setSyncState("syncing");
    setSyncMsg("");
    try {
      const res = await fetch("/api/sync/metrics", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setSyncState("success");
        setSyncMsg("Sync completed successfully.");
      } else {
        setSyncState("error");
        setSyncMsg(json.error || "Sync failed.");
      }
    } catch (e: any) {
      setSyncState("error");
      setSyncMsg(e.message || "Network error.");
    }
    setTimeout(() => setSyncState("idle"), 5000);
  }

  async function exportCSV(table: "daily_metrics" | "media_metrics") {
    setExporting(table === "daily_metrics" ? "daily" : "media");
    const { data } = await supabase
      .from(table)
      .select("*")
      .gte(table === "daily_metrics" ? "metric_date" : "created_at", dateRange.start)
      .lte(table === "daily_metrics" ? "metric_date" : "created_at", dateRange.end);

    if (data && data.length > 0) {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
      const csv = [headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${table}_${dateRange.start}_to_${dateRange.end}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      {/* Connected Brands */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Database className="h-4 w-4 text-indigo-600" />
            </div>
            Connected Brands
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Brand Name</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Meta Connected</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Last Sync</th>
                    <th className="px-6 py-3 font-bold text-gray-700 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {brands.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{b.brand_name}</td>
                      <td className="px-6 py-3">
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" /> Connected
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        {b.lastSync
                          ? new Date(b.lastSync).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : <span className="text-amber-500">No data yet</span>
                        }
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                          b.status === "connected"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                        )}>
                          {b.status === "connected" ? "Active" : "No Data"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <RefreshCw className="h-4 w-4 text-emerald-600" />
            </div>
            Sync Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manually trigger a data sync from Meta Graph API. This fetches the latest metrics for all connected brands.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSync}
              disabled={syncState === "syncing"}
              className={cn(
                "gap-2",
                syncState === "success" && "bg-emerald-600 hover:bg-emerald-700",
                syncState === "error" && "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {syncState === "syncing" && <RefreshCw className="h-4 w-4 animate-spin" />}
              {syncState === "success" && <CheckCircle className="h-4 w-4" />}
              {syncState === "error" && <AlertCircle className="h-4 w-4" />}
              {syncState === "idle" && <RefreshCw className="h-4 w-4" />}
              {syncState === "syncing" ? "Syncing…" : syncState === "success" ? "Sync Complete" : syncState === "error" ? "Sync Failed" : "Sync Now"}
            </Button>
            {syncMsg && <span className={cn("text-sm", syncState === "success" ? "text-emerald-600" : "text-rose-600")}>{syncMsg}</span>}
          </div>

          {/* Auto Sync toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Sync</p>
                <p className="text-xs text-gray-400">Automatically sync every 24 hours</p>
              </div>
            </div>
            <button onClick={toggleAutoSync} className="transition-colors">
              {autoSync
                ? <ToggleRight className="h-7 w-7 text-indigo-600" />
                : <ToggleLeft className="h-7 w-7 text-gray-400" />
              }
            </button>
          </div>

          {/* Last / Next sync info */}
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Pipeline syncs daily automatically</span>
            {autoSync && <span className="flex items-center gap-1 text-indigo-400"><CheckCircle className="h-3 w-3" /> Auto sync enabled</span>}
          </div>

          {/* Backfill historical data */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              Backfill Historical Data
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Fetch up to 30 days of historical reach and impressions from Meta API.
              Note: follower counts cannot be backfilled (Meta API limitation).
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleBackfill}
                disabled={backfillState === "running"}
                className="gap-2 text-sm"
              >
                {backfillState === "running" && <RefreshCw className="h-4 w-4 animate-spin" />}
                {backfillState === "done" && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                {backfillState === "error" && <AlertCircle className="h-4 w-4 text-rose-600" />}
                {(backfillState === "idle") && <History className="h-4 w-4" />}
                {backfillState === "running" ? "Backfilling…" : backfillState === "done" ? "Backfill Complete" : backfillState === "error" ? "Backfill Failed" : "Backfill 30 Days"}
              </Button>
              {backfillMsg && (
                <span className={cn("text-xs max-w-xs", backfillState === "done" ? "text-emerald-600" : "text-rose-600")}>
                  {backfillMsg}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Download className="h-4 w-4 text-blue-600" />
            </div>
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Export data as CSV for the selected date range: <strong>{dateRange.label}</strong>.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => exportCSV("daily_metrics")}
              disabled={exporting === "daily"}
              className="gap-2 text-sm"
            >
              {exporting === "daily" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Daily Metrics CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCSV("media_metrics")}
              disabled={exporting === "media"}
              className="gap-2 text-sm"
            >
              {exporting === "media" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Media Metrics CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
