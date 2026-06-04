"use client";

import { useBrands } from "./BrandContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function BrandSelector() {
  const { brands, selectedBrandIds, toggleBrandSelection, selectAllBrands, clearAllBrands, isBrandSelected } = useBrands();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between h-9 text-sm font-medium"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4" />
            <span className="truncate">
              {selectedBrandIds.length === 0 
                ? "Select Brands..." 
                : selectedBrandIds.length === brands.length 
                  ? "All Brands" 
                  : `${selectedBrandIds.length} Brands Selected`}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="end">
        <div className="p-2 border-b flex justify-between gap-2 bg-muted/30">
          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={selectAllBrands}>
            Select All
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={clearAllBrands}>
            Clear
          </Button>
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {brands.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No brands found.</div>
          ) : (
            brands.map((brand) => (
              <div
                key={brand.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                  isBrandSelected(brand.id) && "bg-accent/50"
                )}
                onClick={() => toggleBrandSelection(brand.id)}
              >
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  isBrandSelected(brand.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                )}>
                  <Check className="h-3 w-3" />
                </div>
                {brand.avatar_url ? (
                  <img src={brand.avatar_url} alt={brand.name} className="h-4 w-4 rounded-full" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">{brand.name}</span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
