"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useMetrics } from "@/hooks/useMetrics";
import { Card } from "@/components/ui/card";
import { Users, Eye, Activity, Heart, MousePointerClick, BarChart3, FileText, TrendingUp, TrendingDown, Trophy, AlertTriangle } from "lucide-react";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { HistoricalDataWarning } from "@/components-v2/HistoricalDataWarning";
import { KpiCard } from "@/components-v2/KpiCard";
import { BrandHealthCard } from "@/components-v2/BrandHealthCard";
import { calculateBrandHealthBreakdowns } from "@/lib/health-score";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

export default function V2ExecutiveDashboard() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const allBrandIds = brands.map(b => b.id);

  const { aggregatedMetrics, trendData, healthSnapshots, universeHealthSnapshots, comparison, loading: isLoading } = useMetrics(
    selectedBrandIds,
    { start: dateRange.start, end: dateRange.end },
    allBrandIds
  );

  const isSingleBrand = selectedBrandIds.length === 1;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading Executive Dashboard…</p>
      </div>
    );
  }

  // Health score breakdowns — fixed 30-day window (healthSnapshots), independent of date filter
  const universeInputs = universeHealthSnapshots.map(s => ({
    id: s.brand_id, reachGrowth: s.reach_growth, engagementRate: s.engagement_rate,
    activationRate: s.activation_rate, followerGrowth: s.follower_growth,
  }));
  const selectedInputs = healthSnapshots.map(s => ({
    id: s.brand_id, reachGrowth: s.reach_growth, engagementRate: s.engagement_rate,
    activationRate: s.activation_rate, followerGrowth: s.follower_growth,
  }));

  const breakdowns = calculateBrandHealthBreakdowns(selectedInputs, universeInputs);
  const sortedBreakdowns = Object.entries(breakdowns).sort((a, b) => b[1].total - a[1].total);
  const topBrand = sortedBreakdowns[0];
  const worstBrand = sortedBreakdowns.length > 1 ? sortedBreakdowns[sortedBreakdowns.length - 1] : null;
  const avgHealth = sortedBreakdowns.length > 0
    ? sortedBreakdowns.reduce((s, [, b]) => s + b.total, 0) / sortedBreakdowns.length
    : 0;
  const brandName = (id: string) => brands.find(b => b.id === id)?.name || id;
  const reachGrowthPct = comparison?.periodReach.changePct ?? null;
  const followerGrowthPct = aggregatedMetrics.netFollowerGrowthPct ?? null;
  const pctStr = (n: number | null) => n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  // Aggregate trend by date
  const aggregatedTrend = trendData.map(point => {
    let totalFollowers = 0, totalReach = 0, totalInteractions = 0;
    Object.keys(point).forEach(key => {
      if (selectedBrandIds.some(id => {
        const b = brands.find(br => br.id === id);
        return b && key.startsWith(b.name || id);
      })) {
        if (key.endsWith("_followers"))  totalFollowers  += (point[key] as number) || 0;
        if (key.endsWith("_reach"))      totalReach      += (point[key] as number) || 0;
        if (key.endsWith("_engagement")) totalInteractions += (point[key] as number) || 0;
      }
    });
    return { date: point.date as string, totalFollowers: totalFollowers > 0 ? totalFollowers : null, totalReach, totalInteractions };
  });

  const labels = aggregatedTrend.map(m => new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));

  const chartOptions: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: "rgba(17,24,39,0.9)", titleColor: "#fff", bodyColor: "#fff",
      padding: 12, displayColors: false, cornerRadius: 8,
      callbacks: { label: (ctx: any) => ctx.parsed.y.toLocaleString() }
    }},
    scales: {
      y: { beginAtZero: false, grid: { color: "rgba(150,150,150,0.1)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 11 }, maxTicksLimit: 7 } },
    },
    interaction: { intersect: false, mode: "index" },
  };

  const mkDataset = (label: string, data: (number | null)[], color: string) => ({
    label, data,
    borderColor: color, backgroundColor: `${color}18`,
    tension: 0, fill: true,
    pointBackgroundColor: color, pointBorderColor: "#fff",
    pointRadius: 4, pointHoverRadius: 6,
  });

  const kpi = {
    followers: aggregatedMetrics.currentFollowers || 0,
    currentDailyReach: aggregatedMetrics.currentDailyReach || 0,
    periodReach: aggregatedMetrics.periodReach || 0,
    profileViews: aggregatedMetrics.totalProfileViews || 0,
    interactions: aggregatedMetrics.totalInteractions || 0,
    activationRate: aggregatedMetrics.activationRate || 0,
    engagementRate: aggregatedMetrics.engagementRate || 0,
    contentPublished: aggregatedMetrics.totalContentPublished || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h2>
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full">
          {dateRange.label}
        </span>
      </div>

      <HistoricalDataWarning
        firstMetricDate={aggregatedMetrics.firstMetricDate}
        latestMetricDate={aggregatedMetrics.latestMetricDate}
        totalAvailableRecords={aggregatedMetrics.totalAvailableRecords}
      />

      {/* KPI Grid — core management metrics. Uniform KpiCard size/spacing; hover ⓘ for formula. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Current Followers" value={kpi.followers.toLocaleString()} icon={Users}
          iconColorClass="text-indigo-600" iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
          trendPct={comparison?.followers.changePct} trendLabel={comparison?.previousLabel}
          previousValue={comparison?.followers.previous ? comparison.followers.previous.toLocaleString() : null}
          info={{ formula: "Σ latest-day followers across selected brands (point-in-time snapshot)", source: "daily_metrics.followers", validation: "Latest row per brand; matches Meta follower_count" }} />
        <KpiCard title="Current Daily Reach" value={kpi.currentDailyReach.toLocaleString()} icon={Eye}
          iconColorClass="text-emerald-600" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          description={`Latest-day snapshot · period total ${kpi.periodReach.toLocaleString()}`}
          info={{ formula: "Σ latest-day reach across brands — a daily snapshot, NOT the period total", source: "daily_metrics.reach", validation: `Day-to-day reach is volatile; period total (Σ all days) = ${kpi.periodReach.toLocaleString()}` }} />
        <KpiCard title="Profile Views" value={kpi.profileViews > 0 ? kpi.profileViews.toLocaleString() : "N/A"} icon={Activity}
          iconColorClass="text-blue-600" iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          trendPct={comparison?.profileViews.changePct} trendLabel={comparison?.previousLabel}
          previousValue={kpi.profileViews > 0 && comparison?.profileViews.previous ? comparison.profileViews.previous.toLocaleString() : null}
          info={{ formula: "Σ latest-day profile_views across brands", source: "daily_metrics.profile_views", validation: "Meta account-level profile_views metric" }} />
        <KpiCard title="Total Interactions" value={kpi.interactions.toLocaleString()} icon={Heart}
          iconColorClass="text-pink-600" iconBgClass="bg-pink-100 dark:bg-pink-900/30"
          trendPct={comparison?.interactions.changePct} trendLabel={comparison?.previousLabel}
          previousValue={comparison?.interactions.previous ? comparison.interactions.previous.toLocaleString() : null}
          info={{ formula: "Σ (likes+comments+shares+saves) of posts published each day in range", source: "daily_metrics.engagement (per-publish-day)", validation: "Reconstructed per publish-day; reconciles with media_metrics" }} />
        <KpiCard title="Audience Activation" value={`${kpi.activationRate.toFixed(2)}%`} icon={MousePointerClick}
          iconColorClass="text-orange-600" iconBgClass="bg-orange-100 dark:bg-orange-900/30"
          description="Daily reach ÷ followers"
          info={{ formula: "avg(daily reach ÷ followers) × 100 across brands", source: "daily_metrics.activation_rate", validation: ">100% means reach exceeded follower count (normal for viral reels)" }} />
        <KpiCard title="Post Engagement Rate" value={`${kpi.engagementRate.toFixed(2)}%`} icon={BarChart3}
          iconColorClass="text-purple-600" iconBgClass="bg-purple-100 dark:bg-purple-900/30"
          description="Avg interactions ÷ reach"
          info={{ formula: "avg of daily (interactions ÷ reach) × 100 over days with content", source: "daily_metrics.engagement_rate", validation: "Averaged only across days that had published content" }} />
        <KpiCard title="Content Published" value={kpi.contentPublished.toLocaleString()} icon={FileText}
          iconColorClass="text-gray-600 dark:text-gray-300" iconBgClass="bg-gray-100 dark:bg-gray-700"
          description="Posts in selected range"
          info={{ formula: "count(posts) where posted_at ∈ selected range", source: "media_metrics.posted_at", validation: "Range-aware count (fixes the old static '115 for every range')" }} />
        <KpiCard title="Avg Health Score" value={avgHealth.toFixed(1)} icon={TrendingUp}
          iconColorClass="text-amber-600" iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          description="Portfolio average (0–100)"
          info={{ formula: "mean of brand Health Scores (Reach 30% + Engagement 30% + Activation 20% + Follower growth 20%)", source: "computed from daily_metrics (fixed 30-day window)", validation: "Growth = avg last 7d vs first 7d; scored relative to portfolio max" }} />
      </div>

      {/* Performance Highlights — same KpiCard structure/alignment */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Top Performing Brand" value={topBrand ? brandName(topBrand[0]) : "—"} valueClassName="text-lg sm:text-xl truncate" icon={Trophy}
          iconColorClass="text-emerald-600" iconBgClass="bg-emerald-100 dark:bg-emerald-900/30"
          description={topBrand ? `Health Score ${topBrand[1].total.toFixed(1)} / 100` : undefined}
          info={{ formula: "Brand with the highest composite Health Score", source: "computed from daily_metrics (30-day window)", validation: "Reach 30% + Engagement 30% + Activation 20% + Follower growth 20%" }} />
        <KpiCard title="Worst Performing Brand" value={worstBrand ? brandName(worstBrand[0]) : "—"} valueClassName="text-lg sm:text-xl truncate" icon={TrendingDown}
          iconColorClass="text-rose-600" iconBgClass="bg-rose-100 dark:bg-rose-900/30"
          description={worstBrand ? `Health Score ${worstBrand[1].total.toFixed(1)} / 100` : undefined}
          info={{ formula: "Brand with the lowest composite Health Score", source: "computed from daily_metrics (30-day window)", validation: "Same weighting as Top Performing Brand" }} />
        <KpiCard title="Reach Growth %" value={pctStr(reachGrowthPct)} icon={Eye}
          iconColorClass="text-blue-600" iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          description={`Period reach vs previous ${dateRange.label}`}
          info={{ formula: "period reach (Σ all days) this window vs previous equal window", source: "daily_metrics.reach", validation: "Period-over-period; previous = same-length prior window" }} />
        <KpiCard title="Follower Growth %" value={pctStr(followerGrowthPct)} icon={Users}
          iconColorClass="text-indigo-600" iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
          description={`Net ${(aggregatedMetrics.netFollowerGain || 0) >= 0 ? "+" : ""}${(aggregatedMetrics.netFollowerGain || 0).toLocaleString()} followers in range`}
          info={{ formula: "(current − start followers) ÷ start × 100 over the range", source: "daily_metrics.followers", validation: "Range-aware: earliest non-null vs latest day" }} />
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {[
          { title: "Reach Trend", sub: "Daily reach", color: "#10b981", data: aggregatedTrend.map(m => m.totalReach) },
          { title: "Follower Growth", sub: "Cumulative", color: "#6366f1", data: aggregatedTrend.map(m => m.totalFollowers) },
          { title: "Engagement Trend", sub: "Daily interactions", color: "#e4405f", data: aggregatedTrend.map(m => m.totalInteractions) },
        ].map(({ title, sub, color, data }) => (
          <Card key={title} className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl border-0">
            <div className="p-5">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
              <p className="text-xs text-gray-500 mb-4">{sub}</p>
              <div className="h-52">
                <Line
                  data={{ labels, datasets: [mkDataset(title, data, color)] }}
                  options={chartOptions}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Brand Health Leaderboard */}
      {sortedBreakdowns.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Brand Health Leaderboard</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Health Score based on last 30 days · growth = avg last 7d vs avg first 7d</p>
          {isSingleBrand ? (
            <div className="max-w-sm">
              {sortedBreakdowns.map(([id, bd]) => {
                const name = brands.find(b => b.id === id)?.name || id;
                return <BrandHealthCard key={id} brandName={name} breakdown={bd} />;
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedBreakdowns.map(([id, bd], i) => {
                const name = brands.find(b => b.id === id)?.name || id;
                return <BrandHealthCard key={id} brandName={name} breakdown={bd} rank={i + 1} />;
              })}
            </div>
          )}
        </div>
      )}

      {selectedBrandIds.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-400">No Brands Selected</p>
            <p className="text-amber-700 dark:text-amber-500/80 text-sm mt-1">Select at least one brand from the top bar.</p>
          </div>
        </div>
      )}
    </div>
  );
}
