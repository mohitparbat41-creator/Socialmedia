"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useGrowthAnalytics, GrowthMetric } from "@/hooks/useGrowthAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components-v2/Evidence";
import { Line, Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { AlertTriangle, Users, Eye, Heart, TrendingUp, TrendingDown, Gauge, PieChart, Zap, UserPlus } from "lucide-react";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const pct = (m: GrowthMetric) => m.changePct == null ? "—" : `${m.changePct >= 0 ? "+" : ""}${m.changePct}%`;
const nf = (n: number) => n.toLocaleString();
const shortDate = (d: string) => { const dt = new Date(d); return `${dt.getDate()} ${dt.toLocaleString("en-US", { month: "short" })}`; };

// Growth metric pill (WoW or MoM) with arrow + "needs history" fallback
function GrowthPill({ m }: { m: GrowthMetric }) {
  if (!m.available) return <span className="text-[11px] text-gray-400 italic">needs more history</span>;
  const pos = (m.changePct ?? 0) >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-bold ${pos ? "text-emerald-600" : "text-rose-600"}`}>
      {pos ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{pct(m)}
    </span>
  );
}

export default function V2GrowthAnalytics() {
  const { selectedBrandIds, brands } = useBrands();
  const g = useGrowthAnalytics(selectedBrandIds);
  const brandName = (id: string) => brands.find(b => b.id === id)?.name || id;

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Growth Analytics</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-500/80">Select at least one brand to view growth analytics.</p>
        </div>
      </div>
    );
  }

  if (g.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading Growth Analytics…</p>
      </div>
    );
  }

  const velocityChart = {
    labels: g.followerSeries.map(s => shortDate(s.date)),
    datasets: [{ label: "Total Followers", data: g.followerSeries.map(s => s.value), borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,0.12)", fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5 }],
  };
  const baseOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(17,24,39,0.92)", padding: 10, cornerRadius: 6 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 }, maxTicksLimit: 8 } },
      y: { grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 } } },
    },
  };

  const contribTop = g.followerContribution.filter(c => c.value > 0).slice(0, 9);
  const contribChart = {
    labels: contribTop.map(c => brandName(c.brand_id)),
    datasets: [{ label: "Net follower gain", data: contribTop.map(c => c.value), backgroundColor: "#6366f1", borderRadius: 5 }],
  };
  const driversSorted = [...g.reachDrivers].slice(0, 9);
  const driversChart = {
    labels: driversSorted.map(c => brandName(c.brand_id)),
    datasets: [{ label: "Reach change (7d vs prior 7d)", data: driversSorted.map(c => c.value), backgroundColor: driversSorted.map(c => c.value >= 0 ? "#10b981" : "#ef4444"), borderRadius: 5 }],
  };
  const horizOpts: any = {
    ...baseOpts, indexAxis: "y",
    plugins: { ...baseOpts.plugins, tooltip: { ...baseOpts.plugins.tooltip, callbacks: { label: (c: any) => ` ${c.parsed.x >= 0 ? "+" : ""}${nf(c.parsed.x)}` } } },
    scales: { x: { ...baseOpts.scales.y, beginAtZero: true }, y: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 10 } } } },
  };

  const gainLossChart = {
    labels: g.gainLoss.map(p => shortDate(p.date)),
    datasets: [
      { type: "bar" as const, label: "Gained", data: g.gainLoss.map(p => p.gained), backgroundColor: "#10b981", borderRadius: 3, stack: "s", order: 2 },
      { type: "bar" as const, label: "Lost", data: g.gainLoss.map(p => -p.lost), backgroundColor: "#ef4444", borderRadius: 3, stack: "s", order: 2 },
      { type: "line" as const, label: "Net", data: g.gainLoss.map(p => p.net), borderColor: "#6366f1", backgroundColor: "#6366f1", tension: 0.3, pointRadius: 0, borderWidth: 2, order: 1 },
    ],
  };
  const gainLossOpts: any = {
    ...baseOpts,
    plugins: { legend: { display: true, position: "bottom", labels: { boxWidth: 10, font: { size: 10 }, color: "rgba(150,150,150,0.8)" } }, tooltip: baseOpts.plugins.tooltip },
    scales: { x: { ...baseOpts.scales.x, stacked: true }, y: { ...baseOpts.scales.y, stacked: false } },
  };

  const VELO = [
    { label: "Followers / day", value: g.velocity.followersPerDay, icon: Users, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30", info: { formula: "(followers now − followers 14 days ago) ÷ 14", source: "daily_metrics.followers", validation: "Net daily follower acceleration over the last 14 days" } },
    { label: "Reach / day", value: g.velocity.reachPerDay, icon: Eye, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", info: { formula: "Σ reach (last 14 days) ÷ 14", source: "daily_metrics.reach", validation: "Average daily reach over the last 14 days" } },
    { label: "Interactions / day", value: g.velocity.interactionsPerDay, icon: Heart, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/30", info: { formula: "Σ interactions (last 14 days) ÷ 14", source: "daily_metrics.engagement", validation: "Average daily interactions over the last 14 days" } },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Growth Analytics</h2>
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-full">Rolling windows · independent of date filter</span>
      </div>
      <p className="text-xs text-gray-400 -mt-3">Growth uses <strong>fixed rolling windows</strong> (last 7d / 30d), not the dashboard date range — so WoW and MoM are always comparable. Reach &amp; Interactions are summed; Followers are point-in-time.</p>

      {/* Growth Velocity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {VELO.map(({ label, value, icon: Icon, color, bg, info }) => (
          <Card key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 overflow-visible">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1"><Gauge className="h-3 w-3" />Velocity · {label}<InfoTip info={info} /></span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value >= 0 ? "+" : ""}{nf(value)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">per day (14-day avg)</p>
          </Card>
        ))}
      </div>

      {/* Growth Scorecard: WoW vs MoM */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><Zap className="h-4 w-4 text-indigo-600" /></div>
            Growth Scorecard
            <InfoTip info={{ formula: "WoW = last 7d vs prior 7d · MoM = last 30d vs prior 30d", source: "daily_metrics", validation: "Reach/Interactions summed; Followers compared at window boundary" }} />
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">WoW &amp; MoM</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 overflow-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                <th className="py-2 pr-3 font-bold">Metric</th>
                <th className="py-2 px-3 font-bold text-right">This week</th>
                <th className="py-2 px-3 font-bold text-right">WoW Growth</th>
                <th className="py-2 px-3 font-bold text-right">This month</th>
                <th className="py-2 px-3 font-bold text-right">MoM Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {[
                { label: "Reach", icon: Eye, wow: g.reachWoW, mom: g.reachMoM, flow: true },
                { label: "Interactions", icon: Heart, wow: g.interactionsWoW, mom: g.interactionsMoM, flow: true },
                { label: "Followers", icon: Users, wow: g.followerWoW, mom: g.followerMoM, flow: false },
              ].map(({ label, icon: Icon, wow, mom, flow }) => (
                <tr key={label} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2.5 pr-3 font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2"><Icon className="h-4 w-4 text-gray-400" />{label}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">{nf(wow.current)}{flow ? "" : " followers"}</td>
                  <td className="py-2.5 px-3 text-right"><GrowthPill m={wow} /></td>
                  <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">{mom.available ? nf(mom.current) : "—"}</td>
                  <td className="py-2.5 px-3 text-right"><GrowthPill m={mom} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {g.followerMoM.available === false && (
            <p className="text-[10px] text-gray-400 mt-2">Follower MoM needs 60 days of follower history — Meta provides ~{g.daysFollowerHistory} days, so it will populate as history accrues.</p>
          )}
        </CardContent>
      </Card>

      {/* Growth Velocity trajectory */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg"><Gauge className="h-4 w-4 text-purple-600" /></div>
            Follower Trajectory
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">{g.daysFollowerHistory}d history</span>
          </CardTitle>
        </CardHeader>
        <CardContent><div className="h-56"><Line data={velocityChart} options={baseOpts} /></div></CardContent>
      </Card>

      {/* Contribution + Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><PieChart className="h-4 w-4 text-indigo-600" /></div>
              Brand Contribution to Growth
              <InfoTip info={{ formula: "Each brand's net follower gain ÷ total net gain across brands", source: "daily_metrics.followers", validation: "Share of portfolio follower growth over available history" }} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64"><Bar data={contribChart} options={horizOpts} /></div>
            {contribTop[0] && <p className="text-[10px] text-gray-400 mt-2"><strong>{brandName(contribTop[0].brand_id)}</strong> drove {contribTop[0].pct.toFixed(0)}% of net follower growth.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
              Reach Growth Drivers
              <InfoTip info={{ formula: "Per brand: Σ reach (last 7d) − Σ reach (prior 7d)", source: "daily_metrics.reach", validation: "Green = accelerating reach, red = declining" }} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64"><Bar data={driversChart} options={horizOpts} /></div>
            <p className="text-[10px] text-gray-400 mt-2">Week-over-week reach change by brand — identifies who is driving (or dragging) portfolio reach.</p>
          </CardContent>
        </Card>
      </div>

      {/* Follower Gain vs Loss */}
      <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg"><UserPlus className="h-4 w-4 text-green-600" /></div>
            Follower Gain vs Loss
            <InfoTip info={{ formula: "Daily new_followers (gained) vs unfollows (lost); Net = gained − lost", source: "daily_metrics.new_followers / unfollows", validation: "Meta follows_and_unfollows; ~30-day history" }} />
            <span className="ml-auto text-[9px] font-medium text-gray-400 normal-case">{g.gainLoss.length}d with data</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {g.gainLoss.length > 0 ? (
            <div className="h-64"><Bar data={gainLossChart as any} options={gainLossOpts} /></div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No follower gain/loss data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
