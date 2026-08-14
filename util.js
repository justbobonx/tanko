/**
 * Shared helpers
 */

/**
 * Axis-aligned rects: { x, y, w, h } (x,y = top-left).
 * Returns true if the two rects overlap (share any area).
 */
function rectInRect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Darken a #rrggbb color by factor (0–1). */
function shadeColor(hex, factor) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}
