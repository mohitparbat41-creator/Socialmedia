"use client";

import { useState } from "react";
import { Image as ImageIcon, Film, Layers, Video, ExternalLink } from "lucide-react";

interface Props {
  src?: string | null;
  mediaId?: string | null;   // when set, image is fetched fresh via /api/ig-image (fixes reels + expiry)
  permalink?: string | null;
  mediaType?: string;
  productType?: string;
  size?: number;
}

/**
 * Renders a post thumbnail.
 * Preferred path: pass `mediaId` → the image is resolved server-side via
 * /api/ig-image, which returns a FRESH thumbnail_url (reels) or media_url
 * (images), avoiding the two failure modes of raw CDN URLs:
 *   1) reels' media_url is a video (video/mp4) → broken in <img>
 *   2) signed CDN URLs expire → 403
 * Falls back to the raw `src` if no mediaId, and to a format-aware placeholder
 * on any error. Overlays an "open on Instagram" link.
 */
export function PostThumbnail({ src, mediaId, permalink, mediaType, productType, size = 48 }: Props) {
  const imgSrc = mediaId ? `/api/ig-image?id=${encodeURIComponent(mediaId)}` : src;
  const [state, setState] = useState<"loading" | "ok" | "error">(imgSrc ? "loading" : "error");

  const isReel = productType === "REELS";
  const { Icon, bg, fg } = isReel
    ? { Icon: Film, bg: "bg-pink-100 dark:bg-pink-900/30", fg: "text-pink-500" }
    : mediaType === "CAROUSEL_ALBUM"
    ? { Icon: Layers, bg: "bg-indigo-100 dark:bg-indigo-900/30", fg: "text-indigo-500" }
    : mediaType === "VIDEO"
    ? { Icon: Video, bg: "bg-amber-100 dark:bg-amber-900/30", fg: "text-amber-500" }
    : { Icon: ImageIcon, bg: "bg-emerald-100 dark:bg-emerald-900/30", fg: "text-emerald-500" };

  const dim = { width: size, height: size };
  const url = permalink || src;

  return (
    <div className="relative group/thumb rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" style={dim}>
      {/* Placeholder / fallback — always rendered underneath the image */}
      {state !== "ok" && (
        <div className={`absolute inset-0 flex items-center justify-center ${bg}`}>
          {state === "loading" ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          ) : (
            <Icon className={`h-5 w-5 ${fg}`} />
          )}
        </div>
      )}

      {/* The actual image (hidden until loaded successfully) */}
      {imgSrc && state !== "error" && (
        <img
          src={imgSrc}
          alt={mediaType || "post"}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover"
          style={{ ...dim, opacity: state === "ok" ? 1 : 0 }}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}

      {/* Open-post overlay */}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
          title="Open on Instagram"
        >
          <ExternalLink className="h-3.5 w-3.5 text-white" />
        </a>
      )}
    </div>
  );
}
