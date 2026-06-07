"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from "chart.js";
import { AlertTriangle, Users, Heart, Eye, Activity } from "lucide-react";
import { HistoricalDataWarning } from "@/components-v2/HistoricalDataWarning";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function V2GrowthAnalytics() {
  const { selectedBrandIds } = useBrands();
  const { dateRange } = useDateRange();
  const { aggregatedMetrics, trendData, loading: isLoading } = useMetrics(
    selectedBrandIds,
    { start: dateRange.start, end: dateRange.end }
  );

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in-up bg-overview-gradient min-h-[calc(100vh-80px)] p-2 -mx-6 -mt-6 px-6 pt-6 smooth-scroll">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Growth Analytics</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-400 text-lg">No Brands Selected</p>
            <p className="text-amber-700 dark:text-amber-500/80 mt-1">Please select at least one brand from the top selector to view growth analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Growth Data...</p>
      </div>
    );
  }

  // Aggregate trends across all selected brands
  const aggregatedTrendData = trendData.map(point => {
    let totalFollowers = 0;
    let totalReach = 0;
    let totalInteractions = 0;
    
    // Sum across all brands for each date
    Object.keys(point).forEach(key => {
      if (key.endsWith('_followers')) totalFollowers += (point[key] as number) || 0;
      if (key.endsWith('_reach')) totalReach += (point[key] as number) || 0;
      if (key.endsWith('_engagement')) totalInteractions += (point[key] as number) || 0;
    });
    
    return {
      date: point.date,
      // null when no real follower data (Meta ~30d limit) → chart skips it
      totalFollowers: totalFollowers > 0 ? totalFollowers : null,
      totalReach,
      totalInteractions
    };
  });

  const labels = aggregatedTrendData.map(m => {
    const d = new Date(m.date as string);
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  });

  const chartTheme = {
    gridColor: 'rgba(150, 150, 150, 0.1)',
    textColor: 'rgba(150, 150, 150, 0.8)',
    fontFamily: "'Inter', sans-serif"
  };

  const createGradient = (ctx: any, colorStart: string, colorEnd: string) => {
    const chartArea = ctx.chart.chartArea;
    if (!chartArea) return colorStart;
    const gradient = ctx.chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, colorEnd);
    gradient.addColorStop(1, colorStart);
    return gradient;
  };

  const followerGrowthData = {
    labels,
    datasets: [
      {
        label: "Followers",
        data: aggregatedTrendData.map(m => m.totalFollowers),
        borderColor: "#8b5cf6", // Purple
        backgroundColor: (context: any) => createGradient(context, 'rgba(139, 92, 246, 0.5)', 'rgba(139, 92, 246, 0.0)'),
        borderWidth: 3,
        tension: 0, // Strict rule: Do not artificially smooth
        fill: true,
        pointBackgroundColor: "#8b5cf6",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const reachGrowthData = {
    labels,
    datasets: [
      {
        label: "Reach",
        data: aggregatedTrendData.map(m => m.totalReach),
        borderColor: "#10b981", // Emerald
        backgroundColor: (context: any) => createGradient(context, 'rgba(16, 185, 129, 0.5)', 'rgba(16, 185, 129, 0.0)'),
        borderWidth: 3,
        tension: 0,
        fill: true,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const engagementGrowthData = {
    labels,
    datasets: [
      {
        label: "Interactions",
        data: aggregatedTrendData.map(m => m.totalInteractions),
        backgroundColor: "#ec4899", // Pink
        borderRadius: 6,
        barThickness: 16,
        hoverBackgroundColor: "#be185d",
      }
    ]
  };

  const commonLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: { 
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { family: chartTheme.fontFamily, size: 13 },
        bodyFont: { family: chartTheme.fontFamily, size: 14, weight: 'bold' }
      }
    },
    scales: {
      y: { 
        beginAtZero: true, 
        grid: { color: chartTheme.gridColor, drawBorder: false },
        ticks: { color: chartTheme.textColor, font: { family: chartTheme.fontFamily }, padding: 10 }
      },
      x: { 
        grid: { display: false },
        ticks: { color: chartTheme.textColor, font: { family: chartTheme.fontFamily }, maxTicksLimit: 10, maxRotation: 0 }
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up bg-overview-gradient min-h-[calc(100vh-80px)] p-2 -mx-6 -mt-6 px-6 pt-6 smooth-scroll">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Growth Analytics</h2>
      </div>

      <HistoricalDataWarning firstMetricDate={aggregatedMetrics.firstMetricDate} latestMetricDate={aggregatedMetrics.latestMetricDate} totalAvailableRecords={aggregatedMetrics.totalAvailableRecords} />

      <div className="grid grid-cols-1 gap-8 mt-6">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 card-hover">
          <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800 mb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div>Follower Growth</div>
                <div className="text-sm font-normal text-gray-500 mt-1">Cumulative audience size over time</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <Line data={followerGrowthData} options={commonLineOptions as any} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 card-hover">
          <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800 mb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Eye className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <div>Reach Growth</div>
                <div className="text-sm font-normal text-gray-500 mt-1">Total content views and impressions</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <Line data={reachGrowthData} options={commonLineOptions as any} />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 card-hover">
          <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-800 mb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 dark:text-white">
              <div className="p-2.5 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <div>Daily Interactions Velocity</div>
                <div className="text-sm font-normal text-gray-500 mt-1">Daily engagement volume (Likes, Comments, Shares)</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <Bar data={engagementGrowthData} options={commonLineOptions as any} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
