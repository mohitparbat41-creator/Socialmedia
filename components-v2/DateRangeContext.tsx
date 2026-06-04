"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type Preset = "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  preset: Preset;
  label: string;
}

interface DateRangeContextType {
  dateRange: DateRange;
  setPreset: (preset: Preset) => void;
  setCustomRange: (start: string, end: string) => void;
}

const fmt = (d: Date) => d.toISOString().split("T")[0];

function computeRange(preset: Preset): DateRange {
  const today = new Date();
  const end = fmt(today);

  const offsetDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return fmt(d);
  };
  const offsetMonth = (months: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - months);
    return fmt(d);
  };
  const offsetYear = (years: number) => {
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - years);
    return fmt(d);
  };

  switch (preset) {
    case "7d":  return { start: offsetDate(7), end, preset, label: "Last 7 Days" };
    case "30d": return { start: offsetDate(30), end, preset, label: "Last 30 Days" };
    case "3m":  return { start: offsetMonth(3), end, preset, label: "Last 3 Months" };
    case "6m":  return { start: offsetMonth(6), end, preset, label: "Last 6 Months" };
    case "1y":  return { start: offsetYear(1), end, preset, label: "Last 1 Year" };
    default:    return { start: offsetDate(30), end, preset: "30d", label: "Last 30 Days" };
  }
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [dateRange, setDateRange] = useState<DateRange>(() => computeRange("30d"));

  const setPreset = useCallback((preset: Preset) => {
    if (preset === "custom") return;
    setDateRange(computeRange(preset));
  }, []);

  const setCustomRange = useCallback((start: string, end: string) => {
    const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setDateRange({ start, end, preset: "custom", label: `${s} – ${e}` });
  }, []);

  return (
    <DateRangeContext.Provider value={{ dateRange, setPreset, setCustomRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}
