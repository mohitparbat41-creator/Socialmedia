"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Heart, Activity, AlertTriangle, ShieldCheck, Clock, TrendingUp, ArrowDown } from "lucide-react";
import { KpiCard } from "@/components-v2/KpiCard";
import { calculateRelativeBrandHealthScores, calculateRelativeContentScores } from "@/lib/health-score";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { HistoricalDataWarning } from "@/components-v2/HistoricalDataWarning";
import { Eye as EyeIcon, MousePointerClick, Globe, Mail, Phone, MessageSquare, MapPin, UserPlus, UserMinus, BarChart3 } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { Chart as ChartJS2, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip as ChartTooltip, Legend as ChartLegend, Filler } from "chart.js";
ChartJS2.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ChartTooltip, ChartLegend, Filler);

export default function V2BrandProfile() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const allBrandIds = brands.map(b => b.id);

  const { aggregatedMetrics, rawMetrics, brandSnapshots, healthSnapshots, universeHealthSnapshots, trendData, loading: isLoading } = useMetrics(
    selectedBrandIds,
    { start: dateRange.start, end: dateRange.end },
    allBrandIds
  );

  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    async function loadMedia() {
      if (selectedBrandIds.length !== 1) return;
      const brandId = selectedBrandIds[0];
      const { data, error } = await supabase
        .from('media_metrics')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        const scored = calculateRelativeContentScores(data.map(p => ({
          ...p,
          id: p.id,
          reach: p.reach || 0,
          engagement: p.total_interactions || p.like_count || 0,
          shares: p.shares || 0
        })));
        setPosts(scored);
      }
    }
    loadMedia();
  }, [selectedBrandIds]);

  if (selectedBrandIds.length !== 1) {
    return (
      <div className="space-y-6 animate-fade-in-up bg-overview-gradient min-h-[calc(100vh-80px)] p-2 -mx-6 -mt-6 px-6 pt-6 smooth-scroll">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">Brand Profile</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-900/50 p-3 rounded-full">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-400 text-lg">Select exactly ONE Brand</p>
            <p className="text-amber-700 dark:text-amber-500/80 mt-1">Please select exactly one brand from the top selector to view its detailed profile.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Brand Profile...</p>
      </div>
    );
  }

  const brand = brands.find(b => b.id === selectedBrandIds[0]);
  if (!brand) return null;

  // Calculate Health Scores — fixed 30-day window (healthSnapshots)
  const universeHealthInputs = universeHealthSnapshots.map(s => ({
    id: s.brand_id,
    reachGrowth: s.reach_growth,
    engagementRate: s.engagement_rate,
    activationRate: s.activation_rate,
    followerGrowth: s.follower_growth
  }));

  const selectedHealthInputs = healthSnapshots.map(s => ({
    id: s.brand_id,
    reachGrowth: s.reach_growth,
    engagementRate: s.engagement_rate,
    activationRate: s.activation_rate,
    followerGrowth: s.follower_growth
  }));

  const healthScores = calculateRelativeBrandHealthScores(selectedHealthInputs, universeHealthInputs);
  const healthScore = healthScores[brand.id] || 0;

  // ── Account-level analytics (Phase 3) — aggregated over selected range ──
  const sumCol = (k: keyof typeof rawMetrics[number]) => rawMetrics.reduce((s, m) => s + ((m[k] as number) || 0), 0);
  const acct = {
    views: sumCol("views"),
    accountsEngaged: sumCol("accounts_engaged"),
    accountsReached: rawMetrics.reduce((mx, m) => Math.max(mx, m.accounts_reached || m.reach || 0), 0),
    profileViews: sumCol("profile_views"),
    websiteClicks: sumCol("website_clicks"),
    emailClicks: sumCol("email_clicks"),
    callClicks: sumCol("call_clicks"),
    textClicks: sumCol("text_message_clicks"),
    directionClicks: sumCol("direction_clicks"),
    newFollowers: sumCol("new_followers"),
    unfollows: sumCol("unfollows"),
  };
  const acctLabels = rawMetrics.map(m => new Date(m.metric_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  const lineOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "rgba(17,24,39,0.9)", padding: 10, cornerRadius: 6 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 }, maxTicksLimit: 8 } },
      y: { grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 } } },
    },
  };
  const mkLine = (data: (number|null)[], color: string) => ({
    labels: acctLabels,
    datasets: [{ data, borderColor: color, backgroundColor: `${color}18`, fill: true, tension: 0, pointRadius: 0, borderWidth: 2, spanGaps: false }],
  });
  // Account flow metrics (views/accounts_engaged/clicks) have ~14d history only.
  // Null the empty (0) days so charts don't draw a misleading flat-zero tail.
  const nz = (arr: number[]) => arr.map(v => (v && v > 0 ? v : null));
  const acctDaysWithData = rawMetrics.filter(m => (m.views || 0) > 0).length;

  // Best time analysis
  let bestDay = "N/A";
  let bestHour = "N/A";
  let topFormat = "N/A";
  
  if (posts.length > 0) {
    const dayStats: Record<number, { eng: number; count: number }> = {};
    const hourStats: Record<number, { eng: number; count: number }> = {};
    const typeStats: Record<string, { eng: number; count: number }> = {};

    posts.forEach(p => {
      const d = new Date(p.posted_at || p.created_at);
      const day = d.getDay();
      const hour = d.getHours();
      const engRate = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;

      if (!dayStats[day]) dayStats[day] = { eng: 0, count: 0 };
      dayStats[day].eng += engRate;
      dayStats[day].count += 1;

      if (!hourStats[hour]) hourStats[hour] = { eng: 0, count: 0 };
      hourStats[hour].eng += engRate;
      hourStats[hour].count += 1;

      const type = p.media_type || 'IMAGE';
      if (!typeStats[type]) typeStats[type] = { eng: 0, count: 0 };
      typeStats[type].eng += engRate;
      typeStats[type].count += 1;
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let maxDayAvg = 0;
    Object.keys(dayStats).forEach(d => {
      const avg = dayStats[Number(d)].eng / dayStats[Number(d)].count;
      if (avg > maxDayAvg) { maxDayAvg = avg; bestDay = days[Number(d)]; }
    });

    let maxHourAvg = 0;
    Object.keys(hourStats).forEach(h => {
      const avg = hourStats[Number(h)].eng / hourStats[Number(h)].count;
      if (avg > maxHourAvg) { maxHourAvg = avg; const hr = Number(h); bestHour = hr === 0 ? '12 AM' : hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr - 12} PM`; }
    });

    let maxFormatAvg = 0;
    Object.keys(typeStats).forEach(t => {
      const avg = typeStats[t].eng / typeStats[t].count;
      if (avg > maxFormatAvg) { maxFormatAvg = avg; topFormat = t; }
    });
  }

  const top10 = posts.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in-up bg-overview-gradient min-h-[calc(100vh-80px)] p-2 -mx-6 -mt-6 px-6 pt-6 smooth-scroll">
      
      {/* Brand Header */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-500/10 dark:bg-pink-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl z-10 flex-shrink-0 bg-gray-100 dark:bg-gray-900">
          {brand.avatar_url ? (
            <img src={brand.avatar_url} alt={brand.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
              {brand.name.charAt(0)}
            </div>
          )}
        </div>
        
        <div className="z-10 text-center md:text-left flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">{brand.name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
            <span className="px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> {(aggregatedMetrics.totalFollowers || 0).toLocaleString()} Followers
            </span>
            <span className="px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" /> {(aggregatedMetrics.totalReach || 0).toLocaleString()} Reach
            </span>
          </div>
        </div>

        <div className="z-10 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-2xl flex flex-col items-center justify-center min-w-[160px] shadow-lg">
          <ShieldCheck className="w-8 h-8 text-amber-500 mb-2" />
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{healthScore.toFixed(1)}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mt-1">Health Score</div>
        </div>
      </div>

      <HistoricalDataWarning firstMetricDate={aggregatedMetrics.firstMetricDate} latestMetricDate={aggregatedMetrics.latestMetricDate} totalAvailableRecords={aggregatedMetrics.totalAvailableRecords} />

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mt-8">
        <KpiCard
          title="Profile Views"
          value={(aggregatedMetrics.totalProfileViews || 0).toLocaleString()}
          icon={Activity}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        />
        <KpiCard
          title="Total Interactions"
          value={(aggregatedMetrics.totalInteractions || 0).toLocaleString()}
          icon={Heart}
          iconColorClass="text-pink-600"
          iconBgClass="bg-pink-100 dark:bg-pink-900/30"
        />
        <KpiCard
          title="Audience Activation"
          value={`${(aggregatedMetrics.activationRate || 0).toFixed(2)}%`}
          icon={Users}
          iconColorClass="text-orange-600"
          iconBgClass="bg-orange-100 dark:bg-orange-900/30"
        />
        <KpiCard
          title="Engagement Rate"
          value={`${(aggregatedMetrics.engagementRate || 0).toFixed(2)}%`}
          icon={TrendingUp}
          iconColorClass="text-purple-600"
          iconBgClass="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* ── Account Analytics (Phase 3) ── */}
      <div className="mt-10">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Account Analytics</h3>
        <p className="text-xs text-gray-400 mb-4">
          Account-level Meta metrics · {dateRange.label}
          {acctDaysWithData > 0 && acctDaysWithData < 25 && (
            <span className="ml-2 text-amber-500">· Views / engaged / clicks: ~{acctDaysWithData}d history (forward-tracking from Meta)</span>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Views (Impressions)", value: acct.views, icon: EyeIcon, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
            { label: "Accounts Reached", value: acct.accountsReached, icon: Users, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
            { label: "Accounts Engaged", value: acct.accountsEngaged, icon: MousePointerClick, color: "text-indigo-600", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
            { label: "Profile Views", value: acct.profileViews, icon: Activity, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
            { label: "New Followers", value: acct.newFollowers, icon: UserPlus, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30" },
            { label: "Unfollows", value: acct.unfollows, icon: UserMinus, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
            { label: "Website Clicks", value: acct.websiteClicks, icon: Globe, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
            { label: "Email Clicks", value: acct.emailClicks, icon: Mail, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
            { label: "Call Clicks", value: acct.callClicks, icon: Phone, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/30" },
            { label: "Text Clicks", value: acct.textClicks, icon: MessageSquare, color: "text-fuchsia-600", bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30" },
            { label: "Direction Clicks", value: acct.directionClicks, icon: MapPin, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-3.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bg} mb-2`}><Icon className={`h-4 w-4 ${color}`} /></div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Account trend charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><EyeIcon className="h-4 w-4 text-emerald-500" />Views Trend <span className="text-[9px] font-normal text-gray-400">last {acctDaysWithData}d</span></p>
            <div className="h-48"><Line data={mkLine(nz(rawMetrics.map(m => m.views || 0)), "#10b981")} options={lineOpts} /></div>
          </Card>
          <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-indigo-500" />Accounts Engaged Trend <span className="text-[9px] font-normal text-gray-400">last {acctDaysWithData}d</span></p>
            <div className="h-48"><Line data={mkLine(nz(rawMetrics.map(m => m.accounts_engaged || 0)), "#6366f1")} options={lineOpts} /></div>
          </Card>
          <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-cyan-500" />Click Actions Breakdown</p>
            <div className="h-48">
              <Bar
                data={{ labels: ["Website","Email","Call","Text","Direction"], datasets: [{ data: [acct.websiteClicks, acct.emailClicks, acct.callClicks, acct.textClicks, acct.directionClicks], backgroundColor: ["#06b6d4","#f59e0b","#14b8a6","#d946ef","#f97316"], borderRadius: 6 }] }}
                options={{ ...lineOpts, plugins: { legend: { display: false } } }}
              />
            </div>
          </Card>
          <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-5">
            <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-green-500" />Follower Gain vs Loss</p>
            <div className="h-48">
              <Bar
                data={{ labels: acctLabels, datasets: [
                  { label: "Gained", data: rawMetrics.map(m => m.new_followers || 0), backgroundColor: "#10b981", borderRadius: 3 },
                  { label: "Lost", data: rawMetrics.map(m => -(m.unfollows || 0)), backgroundColor: "#ef4444", borderRadius: 3 },
                ] }}
                options={{ ...lineOpts, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { ...lineOpts.scales, x: { ...lineOpts.scales.x, stacked: true }, y: { ...lineOpts.scales.y, stacked: true } } }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-6 card-hover">
          <div className="flex flex-col items-center text-center h-full justify-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Best Day to Post</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{bestDay}</p>
          </div>
        </Card>
        
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-6 card-hover">
          <div className="flex flex-col items-center text-center h-full justify-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Best Hour to Post</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{bestHour}</p>
          </div>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 p-6 card-hover">
          <div className="flex flex-col items-center text-center h-full justify-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Top Format</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{topFormat}</p>
          </div>
        </Card>
      </div>

      {/* Top 10 Content */}
      {top10.length > 0 && (
        <Card className="shadow-lg rounded-2xl overflow-hidden border-0 bg-white dark:bg-gray-800 mt-8">
          <CardHeader className="bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              Top 10 High-Performing Content
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Thumbnail</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Date</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-center">Score</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-right">Reach</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-right">Likes</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-white text-right">Eng. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {top10.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-3">
                      {post.media_url ? (
                        <img src={post.media_url} alt="Thumbnail" className="w-14 h-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400 border border-gray-200 dark:border-gray-700">No Img</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(post.posted_at || post.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {post.contentScore?.toFixed(1) || "0.0"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">{(post.reach || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-gray-700 dark:text-gray-300">{(post.like_count || 0).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{post.reach > 0 ? ((post.engagement / post.reach) * 100).toFixed(2) : "0"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
