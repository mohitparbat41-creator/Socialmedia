"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SyncStatus = "idle" | "syncing" | "success" | "error";

export function SyncControls() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLastSync = useCallback(async () => {
    const { data } = await supabase
      .from("daily_metrics")
      .select("metric_date")
      .order("metric_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.metric_date) {
      const d = new Date(data.metric_date);
      setLastSync(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
    }
  }, []);

  useEffect(() => {
    fetchLastSync();
  }, [fetchLastSync]);

  async function handleSync() {
    setStatus("syncing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/sync/metrics", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setStatus("success");
        await fetchLastSync();
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(json.error || "Sync failed");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message || "Network error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {lastSync && (
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Synced {lastSync}</span>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={status === "syncing"}
        className={cn(
          "h-9 gap-1.5 text-xs font-medium",
          status === "success" && "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
          status === "error" && "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/20"
        )}
        title={status === "error" ? errorMsg : "Sync data from Meta API"}
      >
        {status === "syncing" && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
        {status === "success" && <CheckCircle className="h-3.5 w-3.5" />}
        {status === "error" && <AlertCircle className="h-3.5 w-3.5" />}
        {status === "idle" && <RefreshCw className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">
          {status === "syncing" ? "Syncing…" : status === "success" ? "Synced!" : status === "error" ? "Failed" : "Sync Now"}
        </span>
      </Button>
    </div>
  );
}
