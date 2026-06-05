"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Report Configuration</CardTitle>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Selected Brand</p>
              <p className="font-semibold mt-1">Get Set Learn.Official</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date Range</p>
              <p className="font-semibold mt-1">May 1, 2026 - May 31, 2026</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8 p-6 border rounded-lg bg-card">
            
            <section>
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Executive Summary</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your account grew by 12% over the selected period. Total reach was 544K, 
                with an average engagement rate of 5.3%. Brand health remains strong with 
                positive sentiment across most formats.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Growth Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Followers</p>
                  <p className="font-semibold">305K <span className="text-green-500 text-sm ml-2">(+12%)</span></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reach</p>
                  <p className="font-semibold">544K <span className="text-green-500 text-sm ml-2">(+8%)</span></p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Content Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Posts</p>
                  <p className="font-semibold">14</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Top Format</p>
                  <p className="font-semibold">Reels <span className="text-muted-foreground text-sm ml-2">(Avg ER: 8.1%)</span></p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold border-b pb-2 mb-4">Audience Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Top Location</p>
                  <p className="font-semibold">Mumbai <span className="text-muted-foreground text-sm ml-2">(30%)</span></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Top Age Group</p>
                  <p className="font-semibold">25-34 <span className="text-muted-foreground text-sm ml-2">(45%)</span></p>
                </div>
              </div>
            </section>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
