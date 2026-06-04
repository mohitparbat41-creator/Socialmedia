"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { AlertTriangle, Users, Eye, Heart, MousePointerClick, Activity, ShieldCheck } from "lucide-react";
import { HistoricalDataWarning } from "@/components-v2/HistoricalDataWarning";
import { calculateRelativeBrandHealthScores, calculateBrandHealthBreakdowns } from "@/lib/health-score";
import { BrandHealthCard } from "@/components-v2/BrandHealthCard";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement } from "chart.js";
ChartJS.register(BarElement);

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Consistent Brand Colors
const brandColors = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#e4405f", // Pink
  "#f59e42", // Orange
  "#0077b5", // LinkedIn Blue
];

export default function V2BrandComparison() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const allBrandIds = brands.map(b => b.id);

  const { aggregatedMetrics, brandSnapshots, universeSnapshots, trendData, loading: isLoading } = useMetrics(
    selectedBrandIds,
    { start: dateRange.start, end: dateRange.end },
    allBrandIds
  );

  if (selectedBrandIds.length < 2) {
    return (
      <div className="space-y-6 animate-fade-in-up bg-overview-gradient min-h-[calc(100vh-80px)] p-2 -mx-6 -mt-6 px-6 pt-6 smooth-scroll">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Brand Comparison</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-400 text-lg">Not Enough Brands Selected</p>
            <p className="text-amber-700 dark:text-amber-500/80 mt-1">Please select at least two brands from the top selector to use the comparison tools.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Comparison Data...</p>
      </div>
    );
  }

  // Calculate Health Scores
  const universeHealthInputs = universeSnapshots.map(s => ({
    id: s.brand_id,
    reachGrowth: s.reach_growth,
    engagementRate: s.engagement_rate,
    activationRate: s.activation_rate,
    followerGrowth: s.follower_growth
  }));
  
  const selectedHealthInputs = brandSnapshots.map(s => ({
    id: s.brand_id,
    reachGrowth: s.reach_growth,
    engagementRate: s.engagement_rate,
    activationRate: s.activation_rate,
    followerGrowth: s.follower_growth
  }));

  const healthScores = calculateRelativeBrandHealthScores(selectedHealthInputs, universeHealthInputs);
  const healthBreakdowns = calculateBrandHealthBreakdowns(selectedHealthInputs, universeHealthInputs);
  const sortedHealth = Object.entries(healthBreakdowns).sort((a, b) => b[1].total - a[1].total);

  const dates = trendData.map(t => new Date(t.date as string).toLocaleDateString());
  
  const createMultiLineData = (metricKey: "followers" | "reach" | "engagement") => {
    return {
      labels: dates,
      datasets: selectedBrandIds.map((brandId, index) => {
        const brand = brands.find(b => b.id === brandId);
        const color = brandColors[index % brandColors.length];
        
        return {
          label: brand?.name || "Unknown Brand",
          data: trendData.map(t => (t[`${brand?.name || brandId}_${metricKey}`] as number) || 0),
          borderColor: color,
          backgroundColor: `${color}1A`, // 10% opacity
          tension: 0, // strict 0 for accurate points
          fill: true,
          pointBackgroundColor: color,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: color,
          pointRadius: 4,
          pointHoverRadius: 6,
        };
      })
    };
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { 
        position: 'bottom' as const,
        labels: { boxWidth: 12, padding: 8, font: { size: 11 }, color: 'rgba(150,150,150,0.9)' }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: false, 
        grid: { color: 'rgba(150,150,150,0.1)', drawBorder: false },
        ticks: { color: 'rgba(150,150,150,0.7)', font: { size: 11 } }
      },
      x: { 
        grid: { display: false },
        ticks: { color: 'rgba(150,150,150,0.7)', font: { size: 11 }, maxTicksLimit: 7 }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  // Bar chart data builders
  // Full brand names for labels — truncate only if >20 chars
  const barLabels = selectedBrandIds.map(id => {
    const name = brands.find(b => b.id === id)?.name || "Unknown";
    return name.length > 22 ? name.slice(0, 20) + "…" : name;
  });
  // Full names stored separately for tooltips
  const barFullNames = selectedBrandIds.map(id => brands.find(b => b.id === id)?.name || "Unknown");

  const barOptions: any = {
    responsive: true, maintainAspectRatio: false, indexAxis: "y" as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.95)",
        titleColor: "#fff",
        bodyColor: "#e5e7eb",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          title: (items: any[]) => barFullNames[items[0].dataIndex] || "",
          label: (ctx: any) => `  ${ctx.parsed.x.toLocaleString()}`,
        }
      }
    },
    scales: {
      x: {
        grid: { color: "rgba(150,150,150,0.08)" },
        ticks: { color: "rgba(150,150,150,0.8)", font: { size: 10 } }
      },
      y: {
        grid: { display: false },
        ticks: { color: "rgba(200,200,200,0.85)", font: { size: 10 }, padding: 4 }
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Brand Comparison</h2>
        <span className="text-xs text-gray-500 bg-white dark:bg-gray-800 border px-3 py-1.5 rounded-full">{dateRange.label}</span>
      </div>

      <HistoricalDataWarning firstMetricDate={aggregatedMetrics.firstMetricDate} latestMetricDate={aggregatedMetrics.latestMetricDate} totalAvailableRecords={aggregatedMetrics.totalAvailableRecords} />

      {/* ── 1. Portfolio Snapshot Bar Charts (TOP) ── */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Portfolio Snapshot</h3>
        {/* 2 per row — gives brands enough horizontal space to show full names */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[
            { label: "Followers",    color: "#6366f1", data: selectedBrandIds.map(id => brandSnapshots.find(s => s.brand_id === id)?.followers   || 0) },
            { label: "Reach",        color: "#10b981", data: selectedBrandIds.map(id => brandSnapshots.find(s => s.brand_id === id)?.reach        || 0) },
            { label: "Interactions", color: "#e4405f", data: selectedBrandIds.map(id => brandSnapshots.find(s => s.brand_id === id)?.engagement   || 0) },
            { label: "Health Score", color: "#f59e0b", data: selectedBrandIds.map(id => healthScores[id] || 0) },
          ].map(({ label, color, data }) => (
            <Card key={label} className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-5">
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">{label}</p>
              {/* Height scales with number of brands so bars never get cramped */}
              <div style={{ height: `${Math.max(160, selectedBrandIds.length * 28 + 40)}px` }}>
                <Bar
                  data={{ labels: barLabels, datasets: [{ data, backgroundColor: color, borderRadius: 6, borderSkipped: false }] }}
                  options={barOptions}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── 2. Comparison Line Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-4 sm:p-6 card-hover">
          <CardHeader className="pb-6 pt-0 px-0">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Follower Growth Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <Line data={createMultiLineData("followers")} options={commonChartOptions as any} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-4 sm:p-6 card-hover">
          <CardHeader className="pb-6 pt-0 px-0">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-500" />
              Reach Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <Line data={createMultiLineData("reach")} options={commonChartOptions as any} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-4 sm:p-6 card-hover lg:col-span-2">
          <CardHeader className="pb-6 pt-0 px-0">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Engagement Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-72">
              <Line data={createMultiLineData("engagement")} options={commonChartOptions as any} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Health Leaderboard ── */}
      {sortedHealth.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Health Leaderboard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedHealth.map(([id, bd], i) => {
              const name = brands.find(b => b.id === id)?.name || id;
              return <BrandHealthCard key={id} brandName={name} breakdown={bd} rank={i + 1} />;
            })}
          </div>
        </div>
      )}

      {/* ── 4. Comparison Matrix Table (LAST) ── */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Full Metrics Table</h3>
        <Card className="shadow-lg rounded-2xl overflow-hidden border-0 bg-white dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Metric</th>
                  {selectedBrandIds.map(id => {
                    const brand = brands.find(b => b.id === id);
                    return (
                      <th key={id} className="px-6 py-4 font-bold text-right text-gray-900 dark:text-white">
                        {brand?.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {[
                  { label: "Followers",         icon: <Users className="h-4 w-4 text-indigo-600" />,         bg: "bg-indigo-100 dark:bg-indigo-900/30",  getValue: (id: string) => (brandSnapshots.find(s => s.brand_id === id)?.followers || 0).toLocaleString() },
                  { label: "Reach",             icon: <Eye className="h-4 w-4 text-emerald-600" />,          bg: "bg-emerald-100 dark:bg-emerald-900/30", getValue: (id: string) => (brandSnapshots.find(s => s.brand_id === id)?.reach || 0).toLocaleString() },
                  { label: "Total Interactions",icon: <Heart className="h-4 w-4 text-pink-600" />,           bg: "bg-pink-100 dark:bg-pink-900/30",       getValue: (id: string) => (brandSnapshots.find(s => s.brand_id === id)?.engagement || 0).toLocaleString() },
                  { label: "Audience Activation",icon:<MousePointerClick className="h-4 w-4 text-orange-600"/>,bg:"bg-orange-100 dark:bg-orange-900/30",  getValue: (id: string) => `${(brandSnapshots.find(s => s.brand_id === id)?.activation_rate || 0).toFixed(2)}%` },
                  { label: "Brand Health Score",icon: <ShieldCheck className="h-4 w-4 text-amber-600" />,    bg: "bg-amber-100 dark:bg-amber-900/30",    getValue: (id: string) => `${(healthScores[id] || 0).toFixed(1)}/100`, amber: true },
                ].map(({ label, icon, bg, getValue, amber }) => (
                  <tr key={label} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bg}`}>{icon}</div>
                      {label}
                    </td>
                    {selectedBrandIds.map((id) => (
                      <td key={id} className={`px-6 py-4 text-right font-medium ${amber ? "font-bold text-amber-600 dark:text-amber-500" : "text-gray-900 dark:text-white"}`}>
                        {getValue(id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

    </div>
  );
}
