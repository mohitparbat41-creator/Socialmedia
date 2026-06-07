"use client";

import { useState } from "react";
import { Image as ImageIcon, Film, Layers, Video, ExternalLink } from "lucide-react";

interface Props {
  src?: string | null;
  permalink?: string | null;
  mediaType?: string;
  productType?: string;
  size?: number;
}

/**
 * Renders a post thumbnail from an Instagram CDN URL.
 * Instagram CDN URLs are signed and hotlink-protected — they frequently fail
 * to load in the browser (403 / expired) even when the row has a URL. This
 * component shows a graceful, format-aware placeholder on error or when no
 * URL exists, plus a loading shimmer, and overlays a "open post" link.
 */
export function PostThumbnail({ src, permalink, mediaType, productType, size = 48 }: Props) {
  const [state, setState] = useState<"loading" | "ok" | "error">(src ? "loading" : "error");

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
      {src && state !== "error" && (
        <img
          src={src}
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
