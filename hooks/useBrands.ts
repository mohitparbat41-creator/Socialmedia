"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface Brand {
  id: string;
  brand_name: string;
  facebook_page_id: string | null;
  instagram_business_id: string | null;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrands() {
      setLoading(true);
      const { data, error } = await supabase
        .from("brands")
        .select("id, brand_name, facebook_page_id, instagram_business_id")
        .order("brand_name", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setBrands(data || []);
      }
      setLoading(false);
    }
    fetchBrands();
  }, []);

  return { brands, loading, error };
}
