"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentIntelligence() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Content Intelligence</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Format Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-md bg-muted/20">
              <p className="text-muted-foreground mb-2">[ Bar Chart: Reels vs Static ]</p>
              <p className="text-sm font-medium">Avg Eng: Reels 8%, Static 2%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posting Time Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex flex-col justify-center gap-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Best Day</p>
                <p className="text-2xl font-bold text-primary">Tuesday</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Best Hour</p>
                <p className="text-2xl font-bold text-primary">6:00 PM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Post Preview</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reach</th>
                  <th className="px-4 py-3">Likes</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3 rounded-tr-md">ER %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center text-xs">Image</div>
                  </td>
                  <td className="px-4 py-3">12 May</td>
                  <td className="px-4 py-3">45K</td>
                  <td className="px-4 py-3">3.2K</td>
                  <td className="px-4 py-3">450</td>
                  <td className="px-4 py-3 font-medium text-green-500">8.1%</td>
                </tr>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center text-xs">Image</div>
                  </td>
                  <td className="px-4 py-3">10 May</td>
                  <td className="px-4 py-3">32K</td>
                  <td className="px-4 py-3">2.1K</td>
                  <td className="px-4 py-3">200</td>
                  <td className="px-4 py-3 font-medium text-green-500">7.1%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 20 Reels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Post Preview</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Plays</th>
                  <th className="px-4 py-3">Reach</th>
                  <th className="px-4 py-3">Saves</th>
                  <th className="px-4 py-3 rounded-tr-md">ER %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <div className="w-12 h-16 bg-secondary rounded flex items-center justify-center text-xs">Video</div>
                  </td>
                  <td className="px-4 py-3">11 May</td>
                  <td className="px-4 py-3">120K</td>
                  <td className="px-4 py-3">90K</td>
                  <td className="px-4 py-3">1.2K</td>
                  <td className="px-4 py-3 font-medium text-green-500">12.5%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Worst Performing Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-md">
                <tr>
                  <th className="px-4 py-3 rounded-tl-md">Post Preview</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Reach</th>
                  <th className="px-4 py-3">Likes</th>
                  <th className="px-4 py-3">Comments</th>
                  <th className="px-4 py-3 rounded-tr-md">ER %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center text-xs">Image</div>
                  </td>
                  <td className="px-4 py-3">05 May</td>
                  <td className="px-4 py-3">1K</td>
                  <td className="px-4 py-3">20</td>
                  <td className="px-4 py-3">2</td>
                  <td className="px-4 py-3 font-medium text-red-500">2.2%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
