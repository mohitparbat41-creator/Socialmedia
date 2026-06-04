import { NextRequest, NextResponse } from "next/server";
import { backfillBrandMetrics } from "@/lib/meta-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { brandId, days = 30 } = body;
    const result = await backfillBrandMetrics(brandId, days);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
