export interface BrandHealthInput {
  id: string;
  reachGrowth: number;
  engagementRate: number;
  activationRate: number;
  followerGrowth: number;
}

export function calculateRelativeBrandHealthScores(
  brands: BrandHealthInput[],
  benchmarkUniverse: BrandHealthInput[] = brands
): Record<string, number> {
  if (brands.length === 0) return {};
  if (benchmarkUniverse.length === 0) benchmarkUniverse = brands;

  const maxReachGrowth = Math.max(...benchmarkUniverse.map(b => b.reachGrowth), 1);
  const maxEngagementRate = Math.max(...benchmarkUniverse.map(b => b.engagementRate), 1);
  const maxActivationRate = Math.max(...benchmarkUniverse.map(b => b.activationRate), 1);
  const maxFollowerGrowth = Math.max(...benchmarkUniverse.map(b => b.followerGrowth), 1);

  const scores: Record<string, number> = {};

  brands.forEach(brand => {
    // If maximum is negative or 0 in real scenarios, the fallback handles division. 
    // Usually these metrics are >= 0, or we floor them at 0 for scoring.
    const rgScore = Math.max(0, brand.reachGrowth) / Math.max(0.0001, maxReachGrowth);
    const erScore = Math.max(0, brand.engagementRate) / Math.max(0.0001, maxEngagementRate);
    const arScore = Math.max(0, brand.activationRate) / Math.max(0.0001, maxActivationRate);
    const fgScore = Math.max(0, brand.followerGrowth) / Math.max(0.0001, maxFollowerGrowth);

    const rawScore = (rgScore * 0.3) + (erScore * 0.3) + (arScore * 0.2) + (fgScore * 0.2);
    // Convert to percentage
    scores[brand.id] = parseFloat((rawScore * 100).toFixed(2));
  });

  return scores;
}

export interface BrandHealthBreakdown {
  total: number;
  engagement: number;
  reachGrowth: number;
  activation: number;
  followerGrowth: number;
}

export function calculateBrandHealthBreakdowns(
  brands: BrandHealthInput[],
  benchmarkUniverse: BrandHealthInput[] = brands
): Record<string, BrandHealthBreakdown> {
  if (brands.length === 0) return {};
  if (benchmarkUniverse.length === 0) benchmarkUniverse = brands;

  const maxRG = Math.max(...benchmarkUniverse.map(b => b.reachGrowth), 1);
  const maxER = Math.max(...benchmarkUniverse.map(b => b.engagementRate), 1);
  const maxAR = Math.max(...benchmarkUniverse.map(b => b.activationRate), 1);
  const maxFG = Math.max(...benchmarkUniverse.map(b => b.followerGrowth), 1);

  const result: Record<string, BrandHealthBreakdown> = {};
  brands.forEach(brand => {
    const engagement     = parseFloat((Math.max(0, brand.engagementRate)  / Math.max(0.0001, maxER) * 30).toFixed(1));
    const reachGrowth    = parseFloat((Math.max(0, brand.reachGrowth)     / Math.max(0.0001, maxRG) * 30).toFixed(1));
    const activation     = parseFloat((Math.max(0, brand.activationRate)  / Math.max(0.0001, maxAR) * 20).toFixed(1));
    const followerGrowth = parseFloat((Math.max(0, brand.followerGrowth)  / Math.max(0.0001, maxFG) * 20).toFixed(1));
    const total = parseFloat((engagement + reachGrowth + activation + followerGrowth).toFixed(1));
    result[brand.id] = { total, engagement, reachGrowth, activation, followerGrowth };
  });
  return result;
}

export interface ContentHealthInput {
  id: string;
  reach: number;
  engagement: number;
  shares: number;
}

export function calculateRelativeContentScores<T extends ContentHealthInput>(posts: T[]): (T & { contentScore: number })[] {
  if (posts.length === 0) return [];

  const maxReach = Math.max(...posts.map(p => p.reach), 1);
  const maxEngagement = Math.max(...posts.map(p => p.engagement), 1);
  const maxShares = Math.max(...posts.map(p => p.shares), 1);

  return posts.map(post => {
    const rScore = Math.max(0, post.reach) / Math.max(0.0001, maxReach);
    const eScore = Math.max(0, post.engagement) / Math.max(0.0001, maxEngagement);
    const sScore = Math.max(0, post.shares) / Math.max(0.0001, maxShares);

    const rawScore = (rScore * 0.4) + (eScore * 0.4) + (sScore * 0.2);
    
    return {
      ...post,
      contentScore: parseFloat((rawScore * 100).toFixed(2))
    };
  }).sort((a, b) => b.contentScore - a.contentScore);
}
