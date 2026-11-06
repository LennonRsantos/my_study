import { useEffect, useState } from "react";
import { SIMPLE_ICONS, getDeviconUrl, getDeviconUrlFallback } from "@/lib/types";

// In-memory cache so we only fetch each SVG once per session
const svgCache = new Map<string, string>();

interface BrandIconProps {
  icon: string;
  size?: number;
  /** Override color (otherwise uses brand color for Simple Icons, original Devicon colors otherwise). */
  colorOverride?: string;
  className?: string;
}

/**
 * Renders a tech/brand icon.
 * - Devicon icons: rendered as <img> with their original multi-color SVG.
 * - Simple Icons (AI/LLM brands): fetched and recolored with the official brand color.
 */
export function BrandIcon({ icon, size = 24, colorOverride, className }: BrandIconProps) {
  const isSimple = !!SIMPLE_ICONS[icon];
  const [svg, setSvg] = useState<string | null>(isSimple ? svgCache.get(icon) ?? null : null);
  const [imgFallback, setImgFallback] = useState(false);

  useEffect(() => {
    if (!isSimple) return;
    if (svgCache.has(icon)) {
      setSvg(svgCache.get(icon)!);
      return;
    }
    let cancelled = false;
    const url = getDeviconUrl(icon);
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((text) => {
        if (cancelled) return;
        svgCache.set(icon, text);
        setSvg(text);
      })
      .catch(() => {
        if (!cancelled) setImgFallback(true);
      });
    return () => { cancelled = true; };
  }, [icon, isSimple]);

  if (isSimple && svg && !imgFallback) {
    const color = colorOverride ?? SIMPLE_ICONS[icon].color;
    // Pure/near-black brand colors are invisible on dark backgrounds.
    // For those, fall back to currentColor so the icon adapts to surrounding text color.
    const isNearBlack = /^#?(0{3,6}|1[0-9a-f]1[0-9a-f]1[0-9a-f]|1[0-9a-f]{2}1[0-9a-f]{2}1[0-9a-f]{2})$/i.test(color);
    const fillAttr = isNearBlack ? `fill="currentColor"` : `fill="${color}"`;
    const colored = svg.replace(
      /<svg([^>]*)>/,
      `<svg$1 ${fillAttr} width="${size}" height="${size}">`
    );
    return (
      <span
        className={className}
        style={{ width: size, height: size, display: "inline-flex" }}
        dangerouslySetInnerHTML={{ __html: colored }}
      />
    );
  }

  // Devicon (or fallback for Simple Icon fetch failure)
  return (
    <img
      src={getDeviconUrl(icon)}
      alt={icon}
      width={size}
      height={size}
      className={`object-contain ${className ?? ""}`}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.dataset.fallback) {
          img.dataset.fallback = "1";
          img.src = getDeviconUrlFallback(icon);
        }
      }}
    />
  );
}
