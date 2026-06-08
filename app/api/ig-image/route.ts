import { NextRequest, NextResponse } from "next/server";

/**
 * Instagram image proxy.
 *
 * Why this exists:
 *  - Reels store a `media_url` that is a VIDEO (video/mp4) — useless in <img>.
 *    The image is in `thumbnail_url`, which the sync doesn't persist.
 *  - Instagram CDN URLs are signed and expire, so a stored URL eventually 403s.
 *
 * This route resolves a FRESH image URL from Meta by media_id (preferring
 * thumbnail_url for reels/video) or the profile picture by IG account id, then
 * streams the bytes server-side (no browser hotlink/referrer issues). A small
 * in-memory cache avoids re-hitting the Graph API for every thumbnail.
 *
 *   /api/ig-image?id=<media_id>        → post thumbnail (thumbnail_url || media_url)
 *   /api/ig-image?account=<ig_user_id> → profile picture
 */

const BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || "v19.0"}`;
const URL_TTL = 10 * 60 * 1000; // resolved-URL cache: 10 min
const urlCache = new Map<string, { url: string; exp: number }>();

async function resolve(key: string, fetcher: () => Promise<string | null>): Promise<string | null> {
  const c = urlCache.get(key);
  if (c && c.exp > Date.now()) return c.url;
  const url = await fetcher();
  if (url) urlCache.set(key, { url, exp: Date.now() + URL_TTL });
  return url;
}

/**
 * Fetch with small retry. The dev server is a single Node process, so a burst
 * of concurrent thumbnail requests can hit transient socket errors on the
 * outbound fbcdn fetch; a couple of retries recovers them. (fbcdn itself
 * serves high concurrency fine — verified.)
 */
async function fetchWithRetry(url: string, tries = 3): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch { /* transient — retry */ }
    if (i < tries - 1) await new Promise(res => setTimeout(res, 120 * (i + 1)));
  }
  return null;
}

export async function GET(req: NextRequest) {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return new NextResponse(null, { status: 500 });

  const id = req.nextUrl.searchParams.get("id");
  const account = req.nextUrl.searchParams.get("account");
  const cacheKey = id ? `m:${id}` : account ? `a:${account}` : null;
  if (!cacheKey) return new NextResponse(null, { status: 400 });

  let imgUrl: string | null = null;
  try {
    if (id) {
      imgUrl = await resolve(cacheKey, async () => {
        const j = await fetch(`${BASE}/${id}?fields=media_url,thumbnail_url&access_token=${token}`).then(r => r.json());
        return j.thumbnail_url || j.media_url || null;
      });
    } else if (account) {
      imgUrl = await resolve(cacheKey, async () => {
        const j = await fetch(`${BASE}/${account}?fields=profile_picture_url&access_token=${token}`).then(r => r.json());
        return j.profile_picture_url || null;
      });
    }
  } catch { /* fall through to 404 */ }

  if (!imgUrl) return new NextResponse(null, { status: 404 });

  const img = await fetchWithRetry(imgUrl);
  if (!img) { urlCache.delete(cacheKey); return new NextResponse(null, { status: 502 }); }

  const buf = await img.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": img.headers.get("content-type") || "image/jpeg",
      // Browser cache 1h; CDN/proxy 1h with stale-while-revalidate for snappy reloads.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
