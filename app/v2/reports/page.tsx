"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { useDateRange } from "@/components-v2/DateRangeContext";
import { useMetrics } from "@/hooks/useMetrics";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, AlertTriangle, Building2, ShieldCheck, TrendingUp, Users, Eye, Heart, BarChart3, MousePointerClick, RefreshCw } from "lucide-react";
import { TransparentLogo } from "@/components-v2/TransparentLogo";
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { calculateBrandHealthBreakdowns } from "@/lib/health-score";
import { cn } from "@/lib/utils";

type Section = "executive" | "growth" | "content" | "brands";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "executive", label: "Executive Summary" },
  { key: "growth", label: "Growth Summary" },
  { key: "content", label: "Content Summary" },
  { key: "brands", label: "Brand Summary" },
];

export default function V2Reports() {
  const { selectedBrandIds, brands } = useBrands();
  const { dateRange } = useDateRange();
  const allBrandIds = brands.map(b => b.id);

  const { aggregatedMetrics, brandSnapshots, universeSnapshots, loading: isLoading } = useMetrics(
    selectedBrandIds,
    { start: dateRange.start, end: dateRange.end },
    allBrandIds
  );

  const [enabledSections, setEnabledSections] = useState<Record<Section, boolean>>({
    executive: true, growth: true, content: true, brands: true,
  });
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const healthBreakdowns = calculateBrandHealthBreakdowns(
    brandSnapshots.map(s => ({
      id: s.brand_id, reachGrowth: s.reach_growth, engagementRate: s.engagement_rate,
      activationRate: s.activation_rate, followerGrowth: s.follower_growth,
    })),
    universeSnapshots.map(s => ({
      id: s.brand_id, reachGrowth: s.reach_growth, engagementRate: s.engagement_rate,
      activationRate: s.activation_rate, followerGrowth: s.follower_growth,
    }))
  );

  const avgHealthScore = Object.values(healthBreakdowns).length > 0
    ? Object.values(healthBreakdowns).reduce((s, b) => s + b.total, 0) / Object.values(healthBreakdowns).length
    : 0;

  useEffect(() => {
    if (selectedBrandIds.length === 0) return;
    supabase.from("media_metrics").select("*").in("brand_id", selectedBrandIds)
      .order("reach", { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setTopPosts(data); });
  }, [selectedBrandIds]);

  function toggleSection(key: Section) {
    setEnabledSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function generatePDF() {
    if (!reportRef.current) return;
    setIsGenerating(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
      } as any);

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");

      let position = 0;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgWidth, imgHeight);
      let heightLeft = imgHeight - pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`mafatlal-report-${dateRange.start}-to-${dateRange.end}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. See console for details.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function exportCSV() {
    setIsExportingCSV(true);
    const rows: string[] = [];

    // Header
    rows.push("# Mafatlal Performance Report");
    rows.push(`# Date Range: ${dateRange.label} (${dateRange.start} to ${dateRange.end})`);
    rows.push(`# Generated: ${new Date().toLocaleString()}`);
    rows.push(`# Brands: ${brands.filter(b => selectedBrandIds.includes(b.id)).map(b => b.name).join(", ")}`);
    rows.push("");

    // Section 1: Executive Summary
    rows.push("Section,Metric,Value");
    rows.push(`Executive Summary,Total Followers,${aggregatedMetrics.totalFollowers}`);
    rows.push(`Executive Summary,Total Reach,${aggregatedMetrics.totalReach}`);
    rows.push(`Executive Summary,Total Interactions,${aggregatedMetrics.totalInteractions}`);
    rows.push(`Executive Summary,Engagement Rate,${aggregatedMetrics.engagementRate}%`);
    rows.push(`Executive Summary,Activation Rate,${aggregatedMetrics.activationRate}%`);
    rows.push(`Executive Summary,Content Published,${aggregatedMetrics.totalContentPublished}`);
    rows.push(`Executive Summary,Avg Health Score,${avgHealthScore.toFixed(1)}`);
    rows.push("");

    // Section 4: Brand Summary
    rows.push("Brand,Followers,Reach,Interactions,Engagement Rate,Activation Rate,Health Score");
    brandSnapshots.forEach(s => {
      const bd = healthBreakdowns[s.brand_id];
      rows.push(`${s.brand_name},${s.followers},${s.reach},${s.engagement},${s.engagement_rate}%,${s.activation_rate}%,${bd?.total.toFixed(1) || "N/A"}`);
    });

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mafatlal-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportingCSV(false);
  }

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Reports</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-400">No Brands Selected</p>
            <p className="text-amber-700 dark:text-amber-500/80 text-sm mt-1">Select at least one brand from the top bar to generate a report.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedBrandsData = brands.filter(b => selectedBrandIds.includes(b.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Export Reports</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateRange.label} · {selectedBrandsData.length} brand{selectedBrandsData.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={exportCSV}
            disabled={isExportingCSV || isLoading}
            className="gap-2 text-sm"
          >
            {isExportingCSV ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
          <Button
            onClick={generatePDF}
            disabled={isGenerating || isLoading}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
          >
            {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isGenerating ? "Generating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Section toggles */}
      <Card className="bg-white dark:bg-gray-800 shadow rounded-2xl border-0">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Include in PDF</p>
          <div className="flex flex-wrap gap-3">
            {SECTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => toggleSection(key)}
                  className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer",
                    enabledSections[key]
                      ? "bg-indigo-600 border-indigo-600"
                      : "border-gray-300 dark:border-gray-600 hover:border-indigo-400"
                  )}
                >
                  {enabledSections[key] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={cn("text-sm font-medium", enabledSections[key] ? "text-gray-900 dark:text-white" : "text-gray-400 line-through")}>{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium px-1">
        <FileText className="h-3.5 w-3.5" />
        <span>Report Preview — this is what will be exported as PDF</span>
        <span className="ml-auto bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">A4 Portrait</span>
      </div>

      <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-2xl overflow-x-auto">
        {/* ── THE ACTUAL REPORT (captured by html2canvas) ── */}
        <div
          ref={reportRef}
          className="bg-white text-black mx-auto shadow-2xl"
          style={{ width: "794px", fontFamily: "'Inter', Arial, sans-serif", fontSize: "13px" }}
        >
          {/* Report Header */}
          <div className="px-12 pt-10 pb-8 border-b-4 border-red-600 flex justify-between items-end">
            <div>
              <TransparentLogo
                style={{ height: "52px", width: "auto", objectFit: "contain" }}
                alt="Mafatlal"
              />
              <div className="text-base text-gray-500 font-bold uppercase tracking-widest mt-2">Social Media Performance Report</div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <div className="font-semibold text-gray-700">{dateRange.label}</div>
              <div>{dateRange.start} — {dateRange.end}</div>
              <div className="mt-1 text-gray-400">Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
          </div>

          <div className="px-12 py-8 space-y-8">
            {/* Report Metadata */}
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Report Scope</p>
              <div className="flex flex-wrap gap-2">
                {selectedBrandsData.map(b => (
                  <div key={b.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Building2 className="w-3 h-3 text-indigo-600" />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 1: Executive Summary */}
            {enabledSections.executive && (
              <div>
                <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-600 rounded text-white text-xs flex items-center justify-center font-bold">1</span>
                  Executive Summary
                </h3>
                {/* Health Score Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4 mb-5">
                  <div className="p-2.5 bg-amber-100 rounded-full"><ShieldCheck className="w-6 h-6 text-amber-600" /></div>
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Average Brand Health Score</p>
                    <p className="text-2xl font-black text-amber-900">{avgHealthScore.toFixed(1)} <span className="text-sm font-semibold text-amber-600">/ 100</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Total Followers", value: (aggregatedMetrics.totalFollowers||0).toLocaleString(), icon: Users, color: "bg-indigo-50 border-indigo-100 text-indigo-900" },
                    { label: "Total Reach", value: (aggregatedMetrics.totalReach||0).toLocaleString(), icon: Eye, color: "bg-emerald-50 border-emerald-100 text-emerald-900" },
                    { label: "Total Interactions", value: (aggregatedMetrics.totalInteractions||0).toLocaleString(), icon: Heart, color: "bg-pink-50 border-pink-100 text-pink-900" },
                    { label: "Engagement Rate", value: `${(aggregatedMetrics.engagementRate||0).toFixed(2)}%`, icon: BarChart3, color: "bg-purple-50 border-purple-100 text-purple-900" },
                    { label: "Activation Rate", value: `${(aggregatedMetrics.activationRate||0).toFixed(1)}%`, icon: MousePointerClick, color: "bg-orange-50 border-orange-100 text-orange-900" },
                    { label: "Content Published", value: (aggregatedMetrics.totalContentPublished||0).toString(), icon: FileText, color: "bg-gray-50 border-gray-200 text-gray-900" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`border rounded-xl p-3.5 ${color.split(" ").slice(0,2).join(" ")} border-${color.split(" ")[1]}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
                      <p className={`text-xl font-black ${color.split(" ")[2]}`}>{isLoading ? "…" : value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 2: Growth Summary */}
            {enabledSections.growth && (
              <div>
                <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-emerald-600 rounded text-white text-xs flex items-center justify-center font-bold">2</span>
                  Growth Summary
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Follower Growth</p>
                    <p className="text-xl font-black text-emerald-800">
                      {aggregatedMetrics.followersGrowthPct !== null ? `${aggregatedMetrics.followersGrowthPct! > 0 ? "+" : ""}${aggregatedMetrics.followersGrowthPct}%` : "N/A"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{aggregatedMetrics.comparisonLabel}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Reach Growth</p>
                    <p className="text-xl font-black text-blue-800">
                      {aggregatedMetrics.reachGrowthPct !== null ? `${aggregatedMetrics.reachGrowthPct! > 0 ? "+" : ""}${aggregatedMetrics.reachGrowthPct}%` : "N/A"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">{aggregatedMetrics.comparisonLabel}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Tracking Period</p>
                    <p className="text-sm font-bold text-purple-800">{aggregatedMetrics.firstMetricDate || "–"}</p>
                    <p className="text-[10px] text-gray-400 mt-1">to {aggregatedMetrics.latestMetricDate || "–"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Content Summary */}
            {enabledSections.content && (
              <div>
                <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-pink-600 rounded text-white text-xs flex items-center justify-center font-bold">3</span>
                  Content Summary
                </h3>
                {topPosts.length > 0 ? (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-100 px-3 py-2 text-left font-bold text-gray-600">Brand</th>
                        <th className="border border-gray-100 px-3 py-2 text-left font-bold text-gray-600">Type</th>
                        <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Reach</th>
                        <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Likes</th>
                        <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Interactions</th>
                        <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">ER%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPosts.map((p, i) => {
                        const bname = brands.find(b => b.id === p.brand_id)?.name || "Unknown";
                        const er = p.reach > 0 ? ((p.total_interactions || p.like_count || 0) / p.reach * 100).toFixed(2) : "0";
                        const type = p.media_product_type === "REELS" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carousel" : p.media_type === "VIDEO" ? "Video" : "Image";
                        return (
                          <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                            <td className="border border-gray-100 px-3 py-1.5 font-medium text-gray-800">{bname}</td>
                            <td className="border border-gray-100 px-3 py-1.5 text-gray-600">{type}</td>
                            <td className="border border-gray-100 px-3 py-1.5 text-right font-medium">{(p.reach||0).toLocaleString()}</td>
                            <td className="border border-gray-100 px-3 py-1.5 text-right">{(p.like_count||0).toLocaleString()}</td>
                            <td className="border border-gray-100 px-3 py-1.5 text-right">{(p.total_interactions||0).toLocaleString()}</td>
                            <td className="border border-gray-100 px-3 py-1.5 text-right font-bold text-indigo-700">{er}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400 italic">No content data available for selected brands.</p>
                )}
              </div>
            )}

            {/* SECTION 4: Brand Summary */}
            {enabledSections.brands && (
              <div>
                <h3 className="text-base font-bold text-gray-900 border-b-2 border-gray-100 pb-2 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-600 rounded text-white text-xs flex items-center justify-center font-bold">4</span>
                  Brand Summary
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-100 px-3 py-2 text-left font-bold text-gray-600">Brand</th>
                      <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Followers</th>
                      <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Reach</th>
                      <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Interactions</th>
                      <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">ER%</th>
                      <th className="border border-gray-100 px-3 py-2 text-right font-bold text-gray-600">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandSnapshots.map((s, i) => {
                      const bd = healthBreakdowns[s.brand_id];
                      return (
                        <tr key={s.brand_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="border border-gray-100 px-3 py-1.5 font-semibold text-gray-800">{s.brand_name}</td>
                          <td className="border border-gray-100 px-3 py-1.5 text-right">{s.followers.toLocaleString()}</td>
                          <td className="border border-gray-100 px-3 py-1.5 text-right">{s.reach.toLocaleString()}</td>
                          <td className="border border-gray-100 px-3 py-1.5 text-right">{s.engagement.toLocaleString()}</td>
                          <td className="border border-gray-100 px-3 py-1.5 text-right font-medium text-indigo-700">{s.engagement_rate.toFixed(2)}%</td>
                          <td className="border border-gray-100 px-3 py-1.5 text-right font-bold text-amber-700">{bd?.total.toFixed(1) || "–"}/100</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Report Footer */}
            <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[10px] text-gray-400">Mafatlal Social Media Intelligence Dashboard · Confidential</p>
              <p className="text-[10px] text-gray-400">{new Date().toISOString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
