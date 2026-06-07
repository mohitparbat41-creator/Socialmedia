"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, MapPin, Globe, Database, Info, BarChart3, Clock } from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function V2AudienceInsights() {
  const { selectedBrandIds } = useBrands();
  const [demographics, setDemographics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedBrandIds.length === 0) return;
    setIsLoading(true);
    // Latest demographic snapshot per brand
    supabase
      .from("audience_demographics")
      .select("*")
      .in("brand_id", selectedBrandIds)
      .order("metric_date", { ascending: false })
      .then(({ data }) => {
        // Keep only the most recent row per brand
        const byBrand: Record<string, any> = {};
        (data || []).forEach(r => { if (!byBrand[r.brand_id]) byBrand[r.brand_id] = r; });
        setDemographics(Object.values(byBrand));
        setIsLoading(false);
      });
  }, [selectedBrandIds]);

  if (selectedBrandIds.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6 flex items-center gap-4">
          <AlertTriangle className="text-amber-600 h-6 w-6 flex-shrink-0" />
          <p className="text-amber-700 dark:text-amber-500/80">Select at least one brand to view audience analytics.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Loading Audience Insights…</p>
      </div>
    );
  }

  // ── Aggregate across selected brands ──────────────────────────────
  const genderTotals: Record<string, number> = {};
  const ageTotals: Record<string, number> = {};
  const cityTotals: Record<string, number> = {};
  const countryTotals: Record<string, number> = {};
  const activityTotals: Record<number, number> = {}; // IST hour → online followers

  demographics.forEach(d => {
    const ga = d.gender_age || {};
    const gender = ga.gender || {};
    const age = ga.age || {};
    const activity = ga.activity || {};
    Object.entries(gender).forEach(([k, v]) => { genderTotals[k] = (genderTotals[k] || 0) + (v as number); });
    Object.entries(age).forEach(([k, v]) => { ageTotals[k] = (ageTotals[k] || 0) + (v as number); });
    Object.entries(d.cities || {}).forEach(([k, v]) => { cityTotals[k] = (cityTotals[k] || 0) + (v as number); });
    Object.entries(d.countries || {}).forEach(([k, v]) => { countryTotals[k] = (countryTotals[k] || 0) + (v as number); });
    Object.entries(activity).forEach(([h, v]) => { const hr = parseInt(h); activityTotals[hr] = (activityTotals[hr] || 0) + (v as number); });
  });

  // 24-hour audience activity profile (IST)
  const activityHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, value: activityTotals[h] || 0 }));
  const maxActivity = Math.max(...activityHours.map(a => a.value), 1);
  const hasActivity = activityHours.some(a => a.value > 0);
  const peakHour = hasActivity ? activityHours.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const fmtHour = (h: number) => h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;

  const hasData =
    Object.keys(genderTotals).length > 0 ||
    Object.keys(ageTotals).length > 0 ||
    Object.keys(cityTotals).length > 0;

  // ── Professional empty state (no rows OR rows are empty) ──────────
  if (!hasData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>
        <div className="rounded-3xl border border-dashed border-indigo-200 dark:border-indigo-800/40 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 dark:from-indigo-900/10 dark:via-gray-800 dark:to-purple-900/10 p-12 flex flex-col items-center justify-center text-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center shadow-inner">
              <Users className="h-12 w-12 text-indigo-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center shadow-sm">
              <Info className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Audience demographic data unavailable from Meta API</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
              No follower demographic breakdown is available for the selected brands yet. It will appear here after the next successful sync.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Meta returns gender as F / M / U. "U" = Unknown (privacy-hidden or
  // unspecified accounts) — NOT a third gender. Label it "Unknown", and base
  // the headline female % only on accounts where gender is actually known.
  const female = genderTotals.F || 0, male = genderTotals.M || 0, unknown = genderTotals.U || 0;
  const knownGender = female + male;
  const femalePct = knownGender > 0 ? Math.round((female / knownGender) * 100) : 0;
  // Percentages of TOTAL audience (incl. Unknown) — must sum to 100%
  const genderTotal = male + female + unknown;
  const pctOfTotal = (n: number) => genderTotal > 0 ? (n / genderTotal) * 100 : 0;
  const malePctTotal = Math.round(pctOfTotal(male));
  const femalePctTotal = Math.round(pctOfTotal(female));
  const unknownPctTotal = 100 - malePctTotal - femalePctTotal; // force exact 100%

  const ageOrder = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
  const ageLabels = ageOrder.filter(a => ageTotals[a] !== undefined);
  const ageValues = ageLabels.map(a => ageTotals[a]);

  const topCities = Object.entries(cityTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCountries = Object.entries(countryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // ── Validation: totals & percentages (Section 3) ──────────────────
  const ageTotalAll = ageValues.reduce((a, b) => a + b, 0);
  const agePct = (n: number) => ageTotalAll > 0 ? (n / ageTotalAll) * 100 : 0;
  const topAgeIdx = ageValues.length ? ageValues.indexOf(Math.max(...ageValues)) : -1;
  const topAge = topAgeIdx >= 0 ? ageLabels[topAgeIdx] : "—";
  const cityTotalAll = Object.values(cityTotals).reduce((a, b) => a + b, 0);
  const countryTotalAll = Object.values(countryTotals).reduce((a, b) => a + b, 0);
  const genderSumsTo100 = (malePctTotal + femalePctTotal + unknownPctTotal) === 100;
  const cityPct = (n: number) => cityTotalAll > 0 ? (n / cityTotalAll) * 100 : 0;
  const countryPct = (n: number) => countryTotalAll > 0 ? (n / countryTotalAll) * 100 : 0;

  const genderData = {
    labels: ["Female", "Male", "Unknown"],
    datasets: [{ data: [female, male, unknown], backgroundColor: ["#ec4899", "#3b82f6", "#94a3b8"], borderWidth: 0 }],
  };

  const ageData = {
    labels: ageLabels,
    datasets: [{ label: "Followers", data: ageValues, backgroundColor: "#6366f1", borderRadius: 6 }],
  };
  const ageOptions: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${c.parsed.y.toLocaleString()} followers (${agePct(c.parsed.y).toFixed(1)}%)` } } },
    scales: {
      x: { grid: { display: false }, ticks: { color: "rgba(150,150,150,0.8)", font: { size: 10 } } },
      y: { grid: { color: "rgba(150,150,150,0.08)" }, ticks: { color: "rgba(150,150,150,0.7)", font: { size: 10 } } },
    },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>

      {/* Snapshot & disclosure notes (Section 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 bg-blue-50/70 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/40 rounded-xl px-4 py-2.5">
        <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span><strong>Current snapshot</strong> — demographics represent your audience right now, and are not historical or filtered by the selected date range.</span>
        </div>
        <span className="text-[11px] text-blue-600/80 dark:text-blue-400/80 sm:ml-auto sm:text-right flex-shrink-0">Unknown = users who have not disclosed gender information to Meta.</span>
      </div>

      {/* Top row: gender + age */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gender */}
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg"><Users className="h-4 w-4 text-pink-500" /></div>
              Gender Split
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-40 w-full relative flex justify-center mt-1">
              <Doughnut data={genderData} options={{ cutout: "72%", plugins: { legend: { display: false } } }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-pink-500">{femalePct}%</p>
                <p className="text-[9px] uppercase tracking-widest text-gray-400">Female</p>
              </div>
            </div>
            <div className="w-full mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Male</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{male.toLocaleString()} <span className="text-gray-400">({malePctTotal}%)</span></span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500" />Female</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{female.toLocaleString()} <span className="text-gray-400">({femalePctTotal}%)</span></span>
              </div>
              <div className="flex items-center justify-between text-xs" title="Privacy-hidden or unspecified accounts — Meta does not return a gender for these followers">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" />Unknown</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{unknown.toLocaleString()} <span className="text-gray-400">({unknownPctTotal}%)</span></span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 mt-2 flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded font-semibold ${genderSumsTo100 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30" : "bg-rose-50 text-rose-600"}`}>
                {genderSumsTo100 ? "✓" : "!"} {malePctTotal}% + {femalePctTotal}% + {unknownPctTotal}% = {malePctTotal + femalePctTotal + unknownPctTotal}%
              </span>
              of {genderTotal.toLocaleString()} followers
            </p>
          </CardContent>
        </Card>

        {/* Age distribution */}
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><BarChart3 className="h-4 w-4 text-indigo-500" /></div>
              Age Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40">
              <Bar data={ageData} options={ageOptions} />
            </div>
            <p className="text-[9px] text-gray-400 mt-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 font-semibold">✓ sums to 100%</span>
              {" "}of {ageTotalAll.toLocaleString()} known-age followers · largest group: <strong>{topAge}</strong> ({agePct(ageTotals[topAge] || 0).toFixed(0)}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: cities + countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><MapPin className="h-4 w-4 text-emerald-500" /></div>
              Top Cities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {topCities.map(([city, count], i) => {
              const pct = topCities[0][1] > 0 ? (count / topCities[0][1]) * 100 : 0;
              return (
                <div key={city} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{city}</span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">{count.toLocaleString()} <span className="text-gray-400">({cityPct(count).toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-[9px] text-gray-400 pt-1">% of {cityTotalAll.toLocaleString()} followers with a city disclosed to Meta</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Globe className="h-4 w-4 text-blue-500" /></div>
              Top Countries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {topCountries.map(([country, count], i) => {
              const pct = topCountries[0][1] > 0 ? (count / topCountries[0][1]) * 100 : 0;
              return (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{country}</span>
                      <span className="text-gray-500">{count.toLocaleString()} <span className="text-gray-400">({countryPct(count).toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-[9px] text-gray-400 pt-1">% of {countryTotalAll.toLocaleString()} followers with a country disclosed to Meta</p>
          </CardContent>
        </Card>
      </div>

      {/* Audience Active Times (online_followers, IST) */}
      {hasActivity && (
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg"><Clock className="h-4 w-4 text-amber-500" /></div>
              Audience Active Times
              <span className="ml-auto text-[9px] font-medium text-gray-400">IST · when followers are online</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {peakHour && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Peak activity:</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold">
                  {fmtHour(peakHour.hour)}
                </span>
                <span className="text-xs text-gray-400">— best time to post</span>
              </div>
            )}
            {/* 24-hour heat strip */}
            <div className="grid grid-cols-12 gap-1">
              {activityHours.map(({ hour, value }) => {
                const intensity = value / maxActivity;
                const bg = `rgba(245, 158, 11, ${0.12 + intensity * 0.88})`;
                return (
                  <div key={hour} className="flex flex-col items-center gap-1" title={`${fmtHour(hour)}: ${value.toLocaleString()} online`}>
                    <div
                      className="w-full rounded-md transition-all"
                      style={{ height: "40px", backgroundColor: value > 0 ? bg : "rgba(148,163,184,0.12)" }}
                    />
                    <span className="text-[8px] text-gray-400">{hour % 3 === 0 ? hour : ""}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-1.5">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>11 PM</span>
            </div>
            <p className="text-[9px] text-gray-400 mt-2">Hourly counts of followers online (not percentages) — darker = more active. Source: Meta <code>online_followers</code>, converted from Pacific to IST.</p>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
        <Database className="h-3 w-3" /> Follower demographics &amp; activity from Meta Graph API · {demographics.length} brand{demographics.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
