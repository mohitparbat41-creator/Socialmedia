import { Info } from "lucide-react";
import type { Evidence } from "@/lib/content-insights";

/** Hover tooltip showing Formula / Source / Validation for a metric. */
export function InfoTip({ info }: { info: { formula?: string; source?: string; validation?: string } }) {
  return (
    <span className="relative inline-flex group/info align-middle">
      <Info className="h-3 w-3 text-gray-300 dark:text-gray-600 hover:text-indigo-500 cursor-help" />
      <span className="pointer-events-none invisible opacity-0 group-hover/info:visible group-hover/info:opacity-100 transition-opacity duration-150 absolute z-50 left-1/2 -translate-x-1/2 bottom-5 w-60 p-3 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed shadow-2xl ring-1 ring-white/10 text-left font-normal normal-case">
        {info.formula && <span className="block"><span className="font-semibold text-indigo-300">Formula: </span>{info.formula}</span>}
        {info.source && <span className="block mt-1.5"><span className="font-semibold text-emerald-300">Source: </span>{info.source}</span>}
        {info.validation && <span className="block mt-1.5"><span className="font-semibold text-amber-300">Validation: </span>{info.validation}</span>}
      </span>
    </span>
  );
}

/** Sample size · confidence · statistical-significance chips for a recommendation. */
export function EvidenceChips({ e }: { e: Evidence }) {
  const conf = e.confidenceLabel === "High" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : e.confidenceLabel === "Medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" title={`${e.sampleSize} posts in this bucket of ${e.totalAnalyzed} analyzed`}>n={e.sampleSize}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${conf}`} title={`Confidence blends sample size (→15) and effect size (t=${e.tStat})`}>{e.confidenceLabel} confidence</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.significant ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"}`} title={e.pLabel + ` (Welch t=${e.tStat})`}>
        {e.significant ? "p<0.05" : "n.s."}
      </span>
    </div>
  );
}
