"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggler } from "@/components-v2/ThemeToggler";
import { Sidebar } from "@/components-v2/Sidebar";
import { BrandProvider, useBrands } from "@/components-v2/BrandContext";
import { BrandSelector } from "@/components-v2/BrandSelector";
import { DateRangeProvider } from "@/components-v2/DateRangeContext";
import { DateRangePicker } from "@/components-v2/DateRangePicker";
import { SyncControls } from "@/components-v2/SyncControls";
import { AuthGate } from "@/components-v2/AuthGate";
import { supabase } from "@/lib/supabase";

function Topbar({ setSidebarOpen }: { setSidebarOpen: (o: boolean) => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-5 h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 gap-3 flex-shrink-0">
      {/* Left: hamburger + title only (logo lives in sidebar) */}
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 flex-shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-sm font-bold truncate leading-tight">Social Media Dashboard</h1>
          <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">Mafatlal Intelligence</p>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <SyncControls />
        <DateRangePicker />
        <BrandSelector />
        <ThemeToggler />
      </div>
    </header>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { setBrands, setSelectedBrandIds } = useBrands();

  useEffect(() => {
    async function loadBrands() {
      try {
        const { data, error } = await supabase.from("brands").select("*");
        console.log("[BrandLoad] Brands:", data?.length, "Error:", error?.message);
        if (error) throw error;
        if (data && data.length > 0) {
          const mapped = data.map(b => ({
            id: b.id,
            name: b.brand_name || "Unknown Brand",
            avatar_url: b.avatar_url || null,
            instagram_business_id: b.instagram_business_id || null,
          }));
          setBrands(mapped);
          setSelectedBrandIds(mapped.map(b => b.id));
        }
      } catch (err) {
        console.error("[BrandLoad] Failed:", err);
      }
    }
    loadBrands();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <BrandProvider>
        <DateRangeProvider>
          <DashboardShell>{children}</DashboardShell>
        </DateRangeProvider>
      </BrandProvider>
    </AuthGate>
  );
}
