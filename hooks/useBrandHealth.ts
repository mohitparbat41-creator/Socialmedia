"use client";

import { useMemo } from "react";
import { BrandSnapshot, DailyMetric } from "./useMetrics";

export interface BrandHealth {
  brand_name: string;
  score: number;
  components: {
    engagementScore: number;
    reachGrowthScore: number;
    activationScore: number;
    followerGrowthScore: number;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value: number, min: number, max: number) {
  const clamped = clamp(value, min, max);
  return (clamped - min) / (max - min);
}

export function useBrandHealth(
  brandSnapshots: BrandSnapshot[], 
  rawMetrics: DailyMetric[]
) {
  return useMemo(() => {
    // 1. Calculate growth metrics per brand from rawMetrics
    const brandData: Record<string, {
      followersStart: number;
      followersEnd: number;
      reachStart: number;
      reachEnd: number;
    }> = {};

    for (const m of rawMetrics) {
      const b = m.brands?.brand_name || m.brand_id;
      if (!brandData[b]) {
        brandData[b] = {
          followersStart: m.followers, followersEnd: m.followers,
          reachStart: m.reach, reachEnd: m.reach
        };
      } else {
        brandData[b].followersEnd = m.followers;
        brandData[b].reachEnd = m.reach;
      }
    }

    const healthScores: BrandHealth[] = brandSnapshots.map(snap => {
      const bData = brandData[snap.brand_name];
      
      let reachGrowth = 0;
      let followerGrowth = 0;
      
      if (bData && bData.reachStart > 0) {
        reachGrowth = ((bData.reachEnd - bData.reachStart) / bData.reachStart) * 100;
      }
      if (bData && bData.followersStart > 0) {
        followerGrowth = ((bData.followersEnd - bData.followersStart) / bData.followersStart) * 100;
      }

      // 30% Post Engagement Rate (Normalize 0 to 10%)
      const erScore = normalize(snap.engagement_rate, 0, 10) * 30;

      // 30% Reach Growth (Normalize -20% to 50%)
      const rgScore = normalize(reachGrowth, -20, 50) * 30;

      // 20% Reach Multiplier (activation_rate stored as %, e.g. 500 = 5x multiplier)
      // Normalize 0% to 500% (0x to 5x reach multiplier)
      const aarScore = normalize(snap.activation_rate, 0, 500) * 20;

      // 20% Follower Growth (Normalize -5% to 20%)
      const fgScore = normalize(followerGrowth, -5, 20) * 20;

      const totalScore = Math.round(erScore + rgScore + aarScore + fgScore);

      return {
        brand_name: snap.brand_name,
        score: clamp(totalScore, 0, 100),
        components: {
          engagementScore: Math.round(erScore),
          reachGrowthScore: Math.round(rgScore),
          activationScore: Math.round(aarScore),
          followerGrowthScore: Math.round(fgScore),
        }
      };
    });

    return healthScores.sort((a, b) => b.score - a.score);
  }, [brandSnapshots, rawMetrics]);
}
