"use client";

import { Menu, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggler } from "@/components/layout/ThemeToggler";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  // Static placeholders for Phase 1. 
  // In Phase 2, we will hook these up to Zustand or Context for real brand selection & date ranges.
  const lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 sm:px-6 gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden" 
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        
        <div className="flex-1 flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          {/* Brand Selector */}
          <div className="flex items-center gap-2">
            <select className="h-9 w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="all">All Brands</option>
              <option value="1">Coocoo by Mafatlal</option>
              <option value="2">Get Set Learn.Official</option>
              <option value="3">Mafatlal Industries Ltd.</option>
            </select>
          </div>

          <div className="hidden sm:block h-4 w-px bg-border" />

          {/* Date Range */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            <CalendarIcon className="h-4 w-4" />
            <span>May 1, 2026 - May 31, 2026</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground mr-2">
            <span>Last Sync</span>
            <span>{lastSyncTime}</span>
          </div>
          
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
            <RefreshCw className="h-4 w-4" />
            <span>Sync Now</span>
          </Button>

          <Button variant="outline" size="icon" className="sm:hidden">
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Sync Now</span>
          </Button>
          
          <ThemeToggler />
        </div>
      </div>
    </header>
  );
}
