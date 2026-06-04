"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand Connections & Integrations</CardTitle>
          <CardDescription>Manage your connected social media accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div>
              <p className="font-medium text-blue-600">Meta Graph API Token (Connected)</p>
              <p className="text-sm text-muted-foreground">Token expires: Never (Long-lived)</p>
            </div>
            <Button variant="destructive" size="sm">Disconnect</Button>
          </div>

          <div>
            <h3 className="font-medium mb-4">Linked Brands:</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Coocoo by Mafatlal Healthcare</p>
                  <p className="text-sm text-muted-foreground">IG: 17841447627106336</p>
                </div>
                <Button variant="outline" size="sm">Unlink</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Get Set Learn.Official</p>
                  <p className="text-sm text-muted-foreground">IG: 17841455783221690</p>
                </div>
                <Button variant="outline" size="sm">Unlink</Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Mafatlal Industries Ltd.</p>
                  <p className="text-sm text-muted-foreground">IG: 17841401957296515</p>
                </div>
                <Button variant="outline" size="sm">Unlink</Button>
              </div>
            </div>
            <Button className="mt-4" variant="secondary">+ Link New Brand Account</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Default Timezone</p>
                <p className="text-sm text-muted-foreground">Asia/Kolkata</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Default Date Range</p>
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive weekly reports</p>
              </div>
              <Switch checked={true} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Framework</span>
              <span className="font-medium">Next.js 15.3.3</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Database</span>
              <span className="font-medium text-green-500">Supabase Connected</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Environment</span>
              <span className="font-medium">Development</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
