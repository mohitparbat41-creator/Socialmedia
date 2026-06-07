import { NextRequest, NextResponse } from "next/server";
import { syncBrandMetrics } from "@/lib/meta-service";

// POST /api/sync/metrics                  → sync all brands
// POST /api/sync/metrics  body {brandId}  → sync one brand (fast, avoids timeout)
// GET  /api/sync/metrics?brand_id=xxx     → sync one brand
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await syncBrandMetrics(body?.brandId ?? undefined);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const brandId = req.nextUrl.searchParams.get("brand_id") ?? undefined;
    const result = await syncBrandMetrics(brandId);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
