/**
 * Game - tanks, lasers, items, collisions, explosions, respawn
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];
    this.explosions = [];
    this.items = [];

    this.colors = [
      '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
      '#00bcd4', '#ffeb3b', '#f44336', '#8bc34a', '#3f51b5'
    ];
    this.startCount = 60;

    for (let i = 0; i < this.startCount; i++) {
      const color = this.colors[i % this.colors.length];
      // initial: clear field spawn (no overlap), not edge-only
      this._placeTank(color, false);
    }
  }

  _spawnChance() {
    const n = this.tanks.length;
    const lo = this.startCount * 0.5;
    const hi = this.startCount * 1.1;
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

  /**
   * Place a tank if a clear spot is found.
   * edgeOnly: respawns hug the border; initial uses full field.
   * Returns the tank or null if skipped.
   */
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
    const chance = this._spawnChance();
    if (chance <= 0) return;
    if (Math.random() >= chance * dt) return;

    const color = this.colors[Math.floor(Math.random() * this.colors.length)];
    this._placeTank(color, true); // edge only, skip if blocked
  }

  _killTank(tank) {
    if (tank.dead) return;
    tank.dead = true;
    this.explosions.push(new Explosion(tank.x, tank.y, tank.color));
    this.items.push(new EnergyPod(tank.x, tank.y, tank.color));
  }

  update(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const tank of this.tanks) {
      tank.update(dt, w, h, this.tanks);
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

    const n = this.tanks.length;
    for (let i = 0; i < n; i++) {
      const a = this.tanks[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.tanks[j];
        if (b.dead) continue;
        if (rectInRect(a.getHitRect(), b.getHitRect())) {
          this._killTank(a);
          this._killTank(b);
        }
      }
    }

    for (const shooter of this.tanks) {
      if (shooter.dead || !shooter.laserActive) continue;
      const muzzle = shooter.getMuzzle();
      for (const target of this.tanks) {
        if (target === shooter || target.dead) continue;
        if (
          lineInRect(
            muzzle.x,
            muzzle.y,
            shooter.laserEndX,
            shooter.laserEndY,
            target.getHitRect()
          )
        ) {
          this._killTank(target);
        }
      }
    }

    this.tanks = this.tanks.filter((t) => !t.dead);
    this.items = this.items.filter((i) => !i.dead);

    this._trySpawn(dt);

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
