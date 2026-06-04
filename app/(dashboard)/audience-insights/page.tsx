"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AudienceInsights() {
  // Toggle this state to view the different UI states
  const [dataAvailable, setDataAvailable] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Audience Insights</h1>
        <button 
          onClick={() => setDataAvailable(!dataAvailable)}
          className="text-xs text-blue-500 hover:underline"
        >
          Toggle Data Availability State
        </button>
      </div>

      {!dataAvailable ? (
        <Alert variant="destructive" className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Data unavailable from Meta API</AlertTitle>
          <AlertDescription>
            Audience demographics require 100+ followers or advanced authorization from Meta. No estimations or mock data can be generated.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Mumbai, India</span>
                    <span>35%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[35%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Delhi, India</span>
                    <span>20%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[20%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium">Bangalore, India</span>
                    <span>15%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[15%]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Age & Gender Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium mb-2">Gender Split</p>
                  <div className="w-full bg-secondary h-4 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full w-[60%]" title="Male 60%" />
                    <div className="bg-pink-500 h-full w-[40%]" title="Female 40%" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>60% Male</span>
                    <span>40% Female</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Age Distribution</p>
                  <div className="flex justify-between text-sm">
                    <div className="text-center">
                      <p className="font-bold">25%</p>
                      <p className="text-muted-foreground text-xs">18-24</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">45%</p>
                      <p className="text-muted-foreground text-xs">25-34</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">20%</p>
                      <p className="text-muted-foreground text-xs">35-44</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">10%</p>
                      <p className="text-muted-foreground text-xs">45+</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
