"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, TrendingUp, BarChart2, MessageCircle, FileText } from "lucide-react";

export default function ExecutiveDashboard() {
  // Temporary state for single vs multi-brand testing.
  // In a real app, this comes from a global context updated by the Topbar Brand Selector.
  const [isSingleBrand, setIsSingleBrand] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
        {/* Toggle for demonstration purposes */}
        <button 
          onClick={() => setIsSingleBrand(!isSingleBrand)}
          className="text-xs text-blue-500 hover:underline"
        >
          Toggle Single/Multi-Brand View (Currently: {isSingleBrand ? 'Single' : 'Multi'})
        </button>
      </div>

      {/* 1. Top 6 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Row 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Followers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">305.2K</div>
            <p className="text-xs text-green-500">+12.3% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reach</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">544K</div>
            <p className="text-xs text-green-500">+8.7% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5K</div>
            <p className="text-xs text-green-500">+2.1% from last month</p>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audience Activation Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">26.2%</div>
            <p className="text-xs text-green-500">+1.2% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Post Engagement Rate</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.3%</div>
            <p className="text-xs text-green-500">+0.4% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Published</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">in selected period</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Multi-brand conditional row */}
      {!isSingleBrand && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Reach Trend (Aggregated)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
                <p className="text-muted-foreground">[ Multi-line Chart Widget ]</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Growing Brands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Get Set Learn.Official</p>
                  </div>
                  <div className="text-green-500 font-bold">+15%</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Coocoo by Mafatlal</p>
                  </div>
                  <div className="text-green-500 font-bold">+12%</div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Mafatlal Industries Ltd.</p>
                  </div>
                  <div className="text-green-500 font-bold">+8%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Middle Section: Reach Trend & Brand Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isSingleBrand && (
          <Card>
            <CardHeader>
              <CardTitle>Reach Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
                <p className="text-muted-foreground">[ Line Chart Widget ]</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className={!isSingleBrand ? "lg:col-span-2" : ""}>
          <CardHeader>
            <CardTitle>Brand Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground">[ Gauge / Score UI Widget ]</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Content Performance & Audience Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground">[ Bar/Doughnut Chart Widget ]</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audience Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Top Location</p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Mumbai, India</span>
                  <span>30%</span>
                </div>
                <div className="w-full bg-secondary h-2 mt-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[30%]" />
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Top Age Group</p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">25-34</span>
                  <span>45%</span>
                </div>
                <div className="w-full bg-secondary h-2 mt-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-[45%]" />
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Gender Split</p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Male</span>
                  <span>60%</span>
                </div>
                <div className="w-full bg-secondary h-2 mt-1 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full w-[60%]" />
                  <div className="bg-pink-500 h-full w-[40%]" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>60% Male</span>
                  <span>40% Female</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Bottom KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Posts Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">4</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Stories Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">8</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Video Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">12K</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
