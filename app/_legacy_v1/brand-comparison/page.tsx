"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BrandComparison() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Brand Comparison</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Selected Brands</span>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1 bg-secondary rounded-full text-sm font-medium border">
              Get Set Learn.Official <span className="ml-2 cursor-pointer text-muted-foreground hover:text-foreground">×</span>
            </div>
            <div className="px-3 py-1 bg-secondary rounded-full text-sm font-medium border">
              Coocoo by Mafatlal <span className="ml-2 cursor-pointer text-muted-foreground hover:text-foreground">×</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Core KPIs Comparison Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Metric</th>
                  <th className="px-4 py-3">Get Set Learn.Official</th>
                  <th className="px-4 py-3 rounded-tr-md">Coocoo by Mafatlal</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Followers</td>
                  <td className="px-4 py-3">120K</td>
                  <td className="px-4 py-3">55K</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Engagement Rate</td>
                  <td className="px-4 py-3">2.1%</td>
                  <td className="px-4 py-3">7.2%</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3 font-medium">Audience Act. Rate</td>
                  <td className="px-4 py-3">12.5%</td>
                  <td className="px-4 py-3">45.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Share of Voice (Reach)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground">[ Doughnut Chart Widget ]</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follower Growth Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground">[ Multi-line Chart Widget ]</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Top Growing Brands (Leaderboard)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="font-bold mr-4 text-muted-foreground">1</span>
                <span className="font-medium">Coocoo by Mafatlal</span>
              </div>
              <div className="text-green-500 font-bold">+15% Growth</div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="font-bold mr-4 text-muted-foreground">2</span>
                <span className="font-medium">Get Set Learn.Official</span>
              </div>
              <div className="text-green-500 font-bold">+12% Growth</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
