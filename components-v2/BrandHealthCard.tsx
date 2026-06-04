"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { BrandHealthBreakdown } from "@/lib/health-score";

interface BrandHealthCardProps {
  brandName: string;
  breakdown: BrandHealthBreakdown;
  rank?: number;
}

const SEMI_ARC_LENGTH = 157.08; // π × r50

function SemiCircleGauge({ score }: { score: number }) {
  const fill = Math.min(100, Math.max(0, score));
  const dashArray = `${(fill / 100) * SEMI_ARC_LENGTH} ${SEMI_ARC_LENGTH}`;
  return (
    <svg viewBox="0 0 120 68" className="w-28 h-16 flex-shrink-0">
      {/* Track */}
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d="M 10 60 A 50 50 0 0 1 110 60"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        className="transition-all duration-700 ease-out"
        style={{ filter: "drop-shadow(0 0 4px rgba(245,158,11,0.5))" }}
      />
      {/* Score label */}
      <text
        x="60"
        y="52"
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill="#f59e0b"
        fontFamily="inherit"
      >
        {fill.toFixed(0)}
      </text>
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fontSize="9"
        fill="#9ca3af"
        fontFamily="inherit"
      >
        /100
      </text>
    </svg>
  );
}

function BreakdownBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">
        {value.toFixed(1)}/{max}
      </span>
    </div>
  );
}

function Tooltip({ breakdown }: { breakdown: BrandHealthBreakdown }) {
  return (
    <div className="absolute right-2 top-2 z-20 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-2xl w-44 pointer-events-none">
      <p className="font-bold mb-2 text-amber-400">Score Breakdown</p>
      <div className="space-y-1">
        <div className="flex justify-between"><span className="text-gray-300">Engagement Rate</span><span className="font-bold">{breakdown.engagement.toFixed(1)}/30</span></div>
        <div className="flex justify-between"><span className="text-gray-300">Reach Growth</span><span className="font-bold">{breakdown.reachGrowth.toFixed(1)}/30</span></div>
        <div className="flex justify-between"><span className="text-gray-300">Activation Rate</span><span className="font-bold">{breakdown.activation.toFixed(1)}/20</span></div>
        <div className="flex justify-between"><span className="text-gray-300">Follower Growth</span><span className="font-bold">{breakdown.followerGrowth.toFixed(1)}/20</span></div>
        <div className="border-t border-gray-700 pt-1 flex justify-between">
          <span className="text-amber-400 font-bold">Total</span>
          <span className="font-bold text-amber-400">{breakdown.total.toFixed(1)}/100</span>
        </div>
      </div>
    </div>
  );
}

export function BrandHealthCard({ brandName, breakdown, rank }: BrandHealthCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 hover:shadow-xl transition-shadow duration-300 group">
      {rank !== undefined && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
          {rank}
        </div>
      )}

      {/* Info tooltip trigger */}
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {showTooltip && <Tooltip breakdown={breakdown} />}

      {/* Top row: gauge + name */}
      <div className="flex items-center gap-4 mb-3">
        <SemiCircleGauge score={breakdown.total} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">{brandName}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Brand Health Score</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1.5">
        <BreakdownBar label="Engagement"     value={breakdown.engagement}     max={30} color="#3b82f6" />
        <BreakdownBar label="Reach Growth"   value={breakdown.reachGrowth}    max={30} color="#6366f1" />
        <BreakdownBar label="Activation"     value={breakdown.activation}     max={20} color="#8b5cf6" />
        <BreakdownBar label="Follower Growth" value={breakdown.followerGrowth} max={20} color="#ec4899" />
      </div>
    </div>
  );
}
