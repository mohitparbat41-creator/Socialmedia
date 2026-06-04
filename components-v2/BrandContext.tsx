"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type Brand = {
  id: string;
  name: string;
  avatar_url?: string;
};

interface BrandContextType {
  brands: Brand[];
  selectedBrandIds: string[];
  setBrands: (brands: Brand[]) => void;
  setSelectedBrandIds: (ids: string[]) => void;
  toggleBrandSelection: (id: string) => void;
  selectAllBrands: () => void;
  clearAllBrands: () => void;
  isBrandSelected: (id: string) => boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([]);

  const toggleBrandSelection = (id: string) => {
    setSelectedBrandIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  const selectAllBrands = () => {
    setSelectedBrandIds(brands.map((b) => b.id));
  };

  const clearAllBrands = () => {
    setSelectedBrandIds([]);
  };

  const isBrandSelected = (id: string) => selectedBrandIds.includes(id);

  return (
    <BrandContext.Provider
      value={{
        brands,
        selectedBrandIds,
        setBrands,
        setSelectedBrandIds,
        toggleBrandSelection,
        selectAllBrands,
        clearAllBrands,
        isBrandSelected,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrands() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error("useBrands must be used within a BrandProvider");
  }
  return context;
}
