import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColorClass?: string;
  iconBgClass?: string;
  trendPct?: number | null;
  trendLabel?: string;
  description?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconColorClass = "text-blue-500",
  iconBgClass = "bg-blue-100 dark:bg-blue-900/20",
  trendPct,
  trendLabel = "from previous period",
  description
}: KpiCardProps) {
  const isPositive = trendPct && trendPct >= 0;
  const isNegative = trendPct && trendPct < 0;

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-4 sm:p-6 card-hover group border border-gray-100 dark:border-gray-800 relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBgClass} transition-transform duration-500 group-hover:scale-110`}>
          <Icon className={`h-5 w-5 ${iconColorClass}`} />
        </div>
        {trendPct !== undefined && trendPct !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{trendPct}%</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {value}
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </p>
        
        {(description || trendLabel) && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate">
            {description || trendLabel}
          </p>
        )}
      </div>
      
      {/* Decorative background glow on hover */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-gradient-to-br from-white/0 to-gray-100/50 dark:to-gray-700/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </Card>
  );
}
