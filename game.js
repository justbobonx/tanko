/**
 * Game - tanks, laser effects, items, bumps, explosions, respawn
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];
    this.explosions = [];
    this.beams = [];
    this.items = [];

    this.colors = [
      '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
      '#00bcd4', '#ffeb3b', '#f44336', '#8bc34a', '#3f51b5'
    ];
    this.startCount = 60;
    // expected spawns/sec when fully below target
    this.spawnRate = 8;

    for (let i = 0; i < this.startCount; i++) {
      const color = this.colors[i % this.colors.length];
      this._placeTank(color, false);
    }
  }

  /**
   * 1 below ~50, tapers to 0 at ~66. Strong pressure to stay near 60.
   */
  _spawnIntensity() {
    const n = this.tanks.length;
    const target = this.startCount;
    const lo = target * 0.85; // full rate at or below ~51
    const hi = target * 1.1;  // stop at ~66
    if (n >= hi) return 0;
    if (n <= lo) return 1;
    return (hi - n) / (hi - lo);
  }

  _edgePoint(w, h) {
    const m = 40;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: m + Math.random() * (w - m * 2), y: m };
    if (side === 1) return { x: m + Math.random() * (w - m * 2), y: h - m };
    if (side === 2) return { x: m, y: m + Math.random() * (h - m * 2) };
    return { x: w - m, y: m + Math.random() * (h - m * 2) };
  }

  _fieldPoint(w, h) {
    const m = 80;
    return {
      x: m + Math.random() * Math.max(1, w - m * 2),
      y: m + Math.random() * Math.max(1, h - m * 2)
    };
  }

  _placeTank(color, edgeOnly) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const attempts = edgeOnly ? 12 : 80;

    for (let i = 0; i < attempts; i++) {
      const p = edgeOnly ? this._edgePoint(w, h) : this._fieldPoint(w, h);
      const tank = new Tank(p.x, p.y, color);
      const rect = tank.getHitRect();
      let clear = true;
      for (const other of this.tanks) {
        if (rectInRect(rect, other.getHitRect())) {
          clear = false;
          break;
        }
      }
      if (clear) {
        this.tanks.push(tank);
        return tank;
      }
    }
    return null;
  }

  _trySpawn(dt) {
    const intensity = this._spawnIntensity();
    if (intensity <= 0) return;

    // Poisson-ish: expected spawnRate * intensity spawns per second
    let expected = this.spawnRate * intensity * dt;
    // when far below target, allow a burst of multiple attempts this frame
    const deficit = this.startCount - this.tanks.length;
    if (deficit > 10) expected *= 1.5;
    if (deficit > 20) expected *= 1.5;

    while (expected > 0) {
      const p = Math.min(1, expected);
      expected -= 1;
      if (Math.random() >= p) continue;
      if (this.tanks.length >= this.startCount * 1.1) break;
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      this._placeTank(color, true);
    }
  }

  _resolveBumps() {
    const n = this.tanks.length;
    for (let i = 0; i < n; i++) {
      const a = this.tanks[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.tanks[j];
        if (b.dead) continue;
        if (!rectInRect(a.getHitRect(), b.getHitRect())) continue;

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-4) {
          const ang = Math.random() * Math.PI * 2;
          dx = Math.cos(ang);
          dy = Math.sin(ang);
          dist = 1;
        }
        const onx = dx / dist;
        const ony = dy / dist;
        const side =
          (a.x * 12.9898 + a.y * 78.233 + b.x * 4.1414 + b.y) % 1 < 0.5 ? 1 : -1;
        const tangentScale = 0.35;
        let nx = onx - ony * side * tangentScale;
        let ny = ony + onx * side * tangentScale;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;

        const minDist = (a.w + b.w) * 0.5;
        const overlap = minDist - dist;
        if (overlap > 0) {
          const push = overlap * 0.5 + 0.8;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          a.steerTarget = Math.atan2(-ny, -nx);
          b.steerTarget = Math.atan2(ny, nx);
        }
      }
    }
  }

  _killTank(tank) {
    if (tank.dead) return;
    tank.dead = true;
    this.explosions.push(new Explosion(tank.x, tank.y, tank.color));
    this.items.push(new EnergyPod(tank.x, tank.y, tank.color));
  }

  _resolveShots(w, h) {
    const range = laserRange(w);
    for (const shooter of this.tanks) {
      if (shooter.dead || !shooter.pendingShot) continue;
      const shot = shooter.pendingShot;
      shooter.pendingShot = null;

      const end = rayEnd(shot.x, shot.y, shot.angle, w, h, range);
      let closest = null;
      let closestDist = Infinity;
      for (const target of this.tanks) {
        if (target === shooter || target.dead) continue;
        if (!lineInRect(shot.x, shot.y, end.x, end.y, target.getHitRect())) {
          continue;
        }
        const d = Math.hypot(target.x - shot.x, target.y - shot.y);
        if (d < closestDist) {
          closestDist = d;
          closest = target;
        }
      }

      let x2 = end.x;
      let y2 = end.y;
      if (closest) {
        x2 = closest.x;
        y2 = closest.y;
        this._killTank(closest);
      }

      this.beams.push(new LaserBeam(shot.x, shot.y, x2, y2, shot.color, 0.5));
    }
  }

  update(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const tank of this.tanks) {
      tank.update(dt, w, h, this.tanks, this.items);
    }

    this._resolveShots(w, h);

    this._resolveBumps();

    const pad = 14;
    for (const t of this.tanks) {
      t.x = Math.max(pad, Math.min(w - pad, t.x));
      t.y = Math.max(pad, Math.min(h - pad, t.y));
    }

    for (const item of this.items) {
      item.update(dt);
    }

    for (const tank of this.tanks) {
      if (tank.dead) continue;
      const tr = tank.getHitRect();
      for (const item of this.items) {
        if (item.dead) continue;
        if (rectInRect(tr, item.getHitRect())) {
          if (item.onPickup(tank)) item.dead = true;
        }
      }
    }

    this.tanks = this.tanks.filter((t) => !t.dead);
    this.items = this.items.filter((i) => !i.dead);

    this._trySpawn(dt);

    for (const beam of this.beams) {
      beam.update(dt);
    }
    this.beams = this.beams.filter((b) => !b.dead);

    for (const ex of this.explosions) {
      ex.update(dt);
    }
    this.explosions = this.explosions.filter((e) => !e.dead);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0a1f0a';
    ctx.fillRect(0, 0, w, h);

    for (const item of this.items) {
      item.draw(ctx);
    }
    for (const beam of this.beams) {
      beam.draw(ctx);
    }
    for (const tank of this.tanks) {
      tank.draw(ctx);
    }
    for (const ex of this.explosions) {
      ex.draw(ctx);
    }
  }

  addTank(x, y, color) {
    this.tanks.push(new Tank(x, y, color));
  }
}
