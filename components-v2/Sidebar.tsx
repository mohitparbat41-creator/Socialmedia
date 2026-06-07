"use client";

import { Home, BarChart2, Users, PieChart, Activity, FileText, Settings, X, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TransparentLogo } from "./TransparentLogo";

const navItems = [
  { key: "executive",   label: "Executive Dashboard",  icon: Home,      href: "/v2" },
  { key: "brand-profile", label: "Brand Profile",      icon: Users,     href: "/v2/brand-profile" },
  { key: "comparison",  label: "Brand Comparison",     icon: BarChart2, href: "/v2/brand-comparison" },
  { key: "content",     label: "Content Intelligence", icon: PieChart,  href: "/v2/content-intelligence" },
  { key: "library",     label: "Content Library",      icon: LayoutGrid, href: "/v2/content-library" },
  { key: "audience",    label: "Audience Insights",    icon: Users,     href: "/v2/audience-insights" },
  { key: "growth",      label: "Growth Analytics",     icon: Activity,  href: "/v2/growth-analytics" },
  { key: "reports",     label: "Reports",              icon: FileText,  href: "/v2/reports" },
  { key: "settings",    label: "Settings",             icon: Settings,  href: "/v2/settings" },
];

const STORAGE_KEY = "mafatlal-sidebar-collapsed";

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch {}
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r flex flex-col z-50 transition-all duration-300 ease-in-out",
          // Mobile: slides in/out
          "lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop collapse width
          collapsed ? "lg:w-16" : "lg:w-64",
          // Always full on mobile when open
          "w-64"
        )}
      >
        {/* Mobile close */}
        <div className="lg:hidden flex justify-end p-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Logo row + collapse toggle */}
        <div className={cn(
          "flex items-center border-b border-border",
          collapsed ? "lg:justify-center px-0 py-3" : "justify-between px-4 py-3"
        )}>
          {!collapsed && (
            <div className="flex items-center min-w-0 py-1">
              <TransparentLogo
                style={{ height: "38px", width: "auto", objectFit: "contain", maxWidth: "150px" }}
                alt="Mafatlal"
              />
            </div>
          )}
          {collapsed && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
              title="Mafatlal"
            >
              {/* Show just the shield crest portion when collapsed */}
              <TransparentLogo
                style={{ height: "36px", width: "auto", objectFit: "cover", objectPosition: "top center" }}
                alt="M"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="hidden lg:flex h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.key}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground group",
                  collapsed ? "lg:justify-center px-0 py-3 w-full" : "px-3 py-2.5 gap-3",
                  isActive && "bg-accent text-accent-foreground font-semibold"
                )}
                onClick={() => { if (onClose) onClose(); }}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className={cn(
                  "flex-shrink-0",
                  collapsed ? "h-5 w-5" : "h-4 w-4"
                )} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 text-xs text-muted-foreground text-center border-t">
            &copy; {new Date().getFullYear()} Mafatlal
          </div>
        )}
      </aside>
    </>
  );
}
