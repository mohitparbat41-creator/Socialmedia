import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HistoricalDataWarningProps {
  firstMetricDate: string | null;
  latestMetricDate: string | null;
  totalAvailableRecords: number;
}

export function HistoricalDataWarning({ firstMetricDate, latestMetricDate, totalAvailableRecords }: HistoricalDataWarningProps) {
  if (!firstMetricDate || !latestMetricDate) return null;

  const firstDate = new Date(firstMetricDate);
  const latestDate = new Date(latestMetricDate);
  const diffDays = Math.floor((latestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  // Only show warning if date gap is less than 7 days
  if (diffDays >= 7) return null;

  return (
    <Card className="bg-blue-500/10 border-blue-500/30 mb-6">
      <CardContent className="p-4 flex items-start gap-4">
        <div className="p-2 bg-blue-500/20 rounded-full mt-1">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-blue-800 dark:text-blue-300">
            Tracking Data Available
          </p>
          <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-1">
            <strong>From:</strong> {firstMetricDate} <strong>To:</strong> {latestMetricDate}
          </p>
          <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mt-1">
            Long-term trends will become more accurate as more data is collected.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
