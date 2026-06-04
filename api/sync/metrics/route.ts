import { NextRequest, NextResponse } from 'next/server';
import { syncBrandMetrics } from '@/lib/meta-service';

// POST /api/sync/metrics        → sync all brands (fires & returns immediately with status)
// GET  /api/sync/metrics?brand_id=xxx  → sync single brand (fast, testable)

export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get('brand_id');
  
  try {
    const result = await syncBrandMetrics(brandId ?? undefined);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await syncBrandMetrics();
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
