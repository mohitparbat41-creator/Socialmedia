"use client";

import { useEffect, useState } from "react";

interface Props {
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Loads /logo/mafatlal-logo.png and removes near-white background pixels
 * via Canvas API so the logo works on any background colour.
 */
export function TransparentLogo({ className, style, alt = "Mafatlal" }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        // Near-white threshold — removes background while preserving the red logo
        if (r > 220 && g > 220 && b > 220) {
          d[i + 3] = 0; // fully transparent
        } else if (r > 200 && g > 200 && b > 200) {
          // Soft anti-alias edge: semi-transparent
          d[i + 3] = Math.round(((255 - r) / 55) * 255);
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => setDataUrl("__error__");
    img.src = "/logo/mafatlal-logo.png";
  }, []);

  if (dataUrl === null) {
    // Loading — show nothing (parent has fallback text)
    return null;
  }
  if (dataUrl === "__error__") {
    return (
      <span className={className} style={{ color: "#cc0000", fontWeight: 800, ...style }}>
        Mafatlal
      </span>
    );
  }
  return <img src={dataUrl} alt={alt} className={className} style={style} />;
}
