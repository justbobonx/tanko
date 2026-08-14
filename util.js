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

/**
 * Line segment (x1,y1)-(x2,y2) vs axis-aligned rect { x, y, w, h }.
 * True if the segment intersects the rect (including endpoints inside).
 */
function lineInRect(x1, y1, x2, y2, rect) {
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.w;
  const rh = rect.h;

  // either endpoint inside
  const inside = (px, py) =>
    px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  if (inside(x1, y1) || inside(x2, y2)) return true;

  // Liang-Barsky style clip: does segment cross any edge?
  const intersects = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(den) < 1e-10) return false;
    const t = ((ax - cx) * (dy - cy) - (ay - cy) * (dx - cx)) / -den;
    const u = ((ax - cx) * (by - ay) - (ay - cy) * (bx - ax)) / -den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  };

  const x3 = rx + rw;
  const y3 = ry + rh;
  return (
    intersects(x1, y1, x2, y2, rx, ry, x3, ry) || // top
    intersects(x1, y1, x2, y2, x3, ry, x3, y3) || // right
    intersects(x1, y1, x2, y2, x3, y3, rx, y3) || // bottom
    intersects(x1, y1, x2, y2, rx, y3, rx, ry)    // left
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

/** Extend a ray from (x,y) along angle until it hits the canvas edge. */
function rayToCanvasEdge(x, y, angle, worldW, worldH) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let t = Infinity;

  if (dx > 1e-8) t = Math.min(t, (worldW - x) / dx);
  else if (dx < -1e-8) t = Math.min(t, (0 - x) / dx);

  if (dy > 1e-8) t = Math.min(t, (worldH - y) / dy);
  else if (dy < -1e-8) t = Math.min(t, (0 - y) / dy);

  if (!isFinite(t) || t < 0) t = 0;
  return { x: x + dx * t, y: y + dy * t };
}
