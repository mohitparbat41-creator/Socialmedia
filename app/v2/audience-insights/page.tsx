"use client";

import { useBrands } from "@/components-v2/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, MapPin, Globe, PieChart, Database, Info } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

Chart.register(ArcElement, Tooltip, Legend);

export default function V2AudienceInsights() {
  const { selectedBrandIds } = useBrands();
  const [demographics, setDemographics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedBrandIds.length === 0) return;
    setIsLoading(true);
    supabase
      .from("audience_demographics")
      .select("*")
      .in("brand_id", selectedBrandIds)
      .then(({ data }) => {
        setDemographics(data || []);
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

  // Empty state — 0 rows from audience_demographics
  if (demographics.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>

        {/* Premium empty state */}
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
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Audience demographic data unavailable from Meta API
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
              The <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">audience_demographics</code> table is currently empty.
              Meta restricts follower demographic data access; it will appear here once the sync pipeline captures it.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full max-w-xl mt-2">
            {["Gender Split", "Age Distribution", "Top Cities", "Top Countries", "Active Times"].map(label => (
              <div key={label} className="bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center gap-1.5 opacity-50">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full" />
                <span className="text-[10px] text-gray-400 font-medium text-center">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full border border-blue-100 dark:border-blue-800/30">
            <Database className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Data will populate automatically on next successful Meta API sync
            </span>
          </div>
        </div>
      </div>
    );
  }

  // When data exists — aggregate and render charts
  let male = 0, female = 0, other = 0;
  const cities: Record<string, number> = {};
  const countries: Record<string, number> = {};

  demographics.forEach(d => {
    if (d.gender_split) {
      male += d.gender_split.male || 0;
      female += d.gender_split.female || 0;
      other += d.gender_split.other || 0;
    }
    if (d.top_cities) Object.entries(d.top_cities).forEach(([c, v]) => { cities[c] = (cities[c] || 0) + (v as number); });
    if (d.top_countries) Object.entries(d.top_countries).forEach(([c, v]) => { countries[c] = (countries[c] || 0) + (v as number); });
  });

  const totalGender = male + female + other;
  const femalePct = totalGender > 0 ? Math.round((female / totalGender) * 100) : 0;
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const genderData = {
    labels: ["Female", "Male", "Other"],
    datasets: [{ data: [female, male, other], backgroundColor: ["#ec4899", "#3b82f6", "#8b5cf6"], borderWidth: 0 }],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Audience Insights</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg"><Users className="h-4 w-4 text-pink-500" /></div>
              Gender Split
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-36 w-full relative flex justify-center mt-1">
              <Doughnut data={genderData} options={{ cutout: "74%", plugins: { legend: { display: false } } }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-bold text-pink-500">{femalePct}%</p>
                <p className="text-[9px] uppercase tracking-widest text-gray-400">Female</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><MapPin className="h-4 w-4 text-emerald-500" /></div>
              Top Cities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {topCities.map(([city, count], i) => (
              <div key={city} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-3">{i + 1}</span>
                <div className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{city}</div>
                <span className="text-xs text-gray-500">{count.toLocaleString()}</span>
              </div>
            ))}
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
            {topCountries.map(([country, count], i) => (
              <div key={country} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-3">{i + 1}</span>
                <div className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{country}</div>
                <span className="text-xs text-gray-500">{count.toLocaleString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-2xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
              <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg"><PieChart className="h-4 w-4 text-indigo-500" /></div>
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{femalePct}%</p>
              <p className="text-xs text-gray-500">Female audience</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{topCountries[0]?.[0] || "N/A"}</p>
              <p className="text-xs text-gray-500">Top country</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
