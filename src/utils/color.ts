/**
 * Safely applies an alpha channel (0..1) to any color format (HEX, RGB, RGBA, HSL, HSLA).
 */
export function colorWithAlpha(color: string, alpha: number): string {
  if (!color) return `rgba(56, 189, 248, ${alpha})`;
  const a = Math.max(0, Math.min(1, alpha));
  const trimmed = color.trim();

  // 1. Hex #rgb or #rrggbb or #rrggbbaa
  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) || 0;
      const g = parseInt(hex.slice(2, 4), 16) || 0;
      const b = parseInt(hex.slice(4, 6), 16) || 0;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  // 2. rgb(r, g, b)
  if (trimmed.startsWith("rgb(")) {
    return trimmed.replace("rgb(", "rgba(").replace(")", `, ${a})`);
  }

  // 3. rgba(r, g, b, existingAlpha)
  if (trimmed.startsWith("rgba(")) {
    return trimmed.replace(/,\s*[\d.]+\)$/, `, ${a})`);
  }

  // 4. hsl(h, s, l)
  if (trimmed.startsWith("hsl(")) {
    return trimmed.replace("hsl(", "hsla(").replace(")", `, ${a})`);
  }

  // 5. hsla(h, s, l, existingAlpha)
  if (trimmed.startsWith("hsla(")) {
    return trimmed.replace(/,\s*[\d.]+\)$/, `, ${a})`);
  }

  return trimmed;
}
