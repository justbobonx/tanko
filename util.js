/**
 * Shared helpers
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
 */
function lineInRect(x1, y1, x2, y2, rect) {
  const rx = rect.x;
  const ry = rect.y;
  const rw = rect.w;
  const rh = rect.h;

  const inside = (px, py) =>
    px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  if (inside(x1, y1) || inside(x2, y2)) return true;

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
    intersects(x1, y1, x2, y2, rx, ry, x3, ry) ||
    intersects(x1, y1, x2, y2, x3, ry, x3, y3) ||
    intersects(x1, y1, x2, y2, x3, y3, rx, y3) ||
    intersects(x1, y1, x2, y2, rx, y3, rx, ry)
  );
}

function shadeColor(hex, factor) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r},${g},${b})`;
}

/** Default laser / sight range: half canvas width. */
function laserRange(worldW) {
  return worldW * 0.5;
}

/**
 * Ray from (x,y) along angle, capped by maxLen and canvas edges.
 */
function rayEnd(x, y, angle, worldW, worldH, maxLen) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let t = maxLen;

  if (dx > 1e-8) t = Math.min(t, (worldW - x) / dx);
  else if (dx < -1e-8) t = Math.min(t, (0 - x) / dx);

  if (dy > 1e-8) t = Math.min(t, (worldH - y) / dy);
  else if (dy < -1e-8) t = Math.min(t, (0 - y) / dy);

  if (!isFinite(t) || t < 0) t = 0;
  return { x: x + dx * t, y: y + dy * t };
}

/** @deprecated use rayEnd with laserRange */
function rayToCanvasEdge(x, y, angle, worldW, worldH) {
  return rayEnd(x, y, angle, worldW, worldH, 1e9);
}
