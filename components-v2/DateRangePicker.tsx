"use client";

import { useState } from "react";
import { useDateRange, Preset } from "./DateRangeContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "7d",  label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "3m",  label: "3 Months" },
  { key: "6m",  label: "6 Months" },
  { key: "1y",  label: "1 Year" },
];

export function DateRangePicker() {
  const { dateRange, setPreset, setCustomRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(dateRange.start);
  const [customEnd, setCustomEnd] = useState(dateRange.end);

  function handlePreset(preset: Preset) {
    setPreset(preset);
    setOpen(false);
  }

  function handleApplyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      setCustomRange(customStart, customEnd);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-sm font-medium border-border bg-card hover:bg-accent"
        >
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{dateRange.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-1 mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Quick Select</p>
          <div className="grid grid-cols-3 gap-1">
            {PRESETS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePreset(key)}
                className={cn(
                  "px-2 py-1.5 text-xs rounded-lg border transition-colors font-medium",
                  dateRange.preset === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-muted/50 text-foreground border-border hover:border-indigo-400 hover:text-indigo-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Custom Range</p>
          <div className="space-y-1.5">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                max={customEnd || undefined}
                className="w-full mt-0.5 text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                min={customStart || undefined}
                className="w-full mt-0.5 text-xs px-2 py-1.5 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleApplyCustom}
            disabled={!customStart || !customEnd || customStart > customEnd}
          >
            Apply Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
