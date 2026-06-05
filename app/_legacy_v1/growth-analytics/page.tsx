"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GrowthAnalytics() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Growth Analytics</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follower Growth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
            <p className="text-muted-foreground">[ Large Smooth Line Chart ]</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reach Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
            <p className="text-muted-foreground">[ Bar Chart Overlaying Line Chart ]</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Net Follower Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex flex-col justify-center">
              <p className="text-4xl font-bold text-green-500">+543</p>
              <p className="text-muted-foreground mt-2">new followers this period</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Views Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground">[ Line Chart ]</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
