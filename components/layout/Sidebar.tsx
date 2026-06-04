"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Target, Users, TrendingUp, Settings, FileBarChart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Executive Dashboard", icon: Home },
  { href: "/brand-comparison", label: "Brand Comparison", icon: Target },
  { href: "/content-intelligence", label: "Content Intelligence", icon: FileText },
  { href: "/audience-insights", label: "Audience Insights", icon: Users },
  { href: "/growth-analytics", label: "Growth Analytics", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 lg:translate-x-0 w-64 h-screen bg-card border-r flex flex-col z-50 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <h1 className="font-bold text-xl tracking-tight">Social Dashboard</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground font-semibold"
                )}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 text-xs text-muted-foreground text-center border-t mt-auto">
          &copy; {new Date().getFullYear()} Mafatlal
        </div>
      </aside>
    </>
  );
}
