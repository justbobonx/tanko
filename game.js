/**
 * Game - tanks, collisions, explosions
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];
    this.explosions = [];

    const colors = [
      '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
      '#00bcd4', '#ffeb3b', '#f44336', '#8bc34a', '#3f51b5'
    ];
    const count = 10;

    const w = Math.max(canvas.width, 1);
    const h = Math.max(canvas.height, 1);
    const margin = 80;

    for (let i = 0; i < count; i++) {
      const tank = this._spawnClear(w, h, margin, colors[i % colors.length]);
      if (tank) this.tanks.push(tank);
    }
  }

  /** Try random positions until body rect does not overlap any existing tank. */
  _spawnClear(w, h, margin, color) {
    const maxTries = 80;
    for (let t = 0; t < maxTries; t++) {
      const x = margin + Math.random() * Math.max(1, w - margin * 2);
      const y = margin + Math.random() * Math.max(1, h - margin * 2);
      const candidate = new Tank(x, y, color);
      const rect = candidate.getHitRect();
      let ok = true;
      for (const other of this.tanks) {
        if (rectInRect(rect, other.getHitRect())) {
          ok = false;
          break;
        }
      }
      if (ok) return candidate;
    }
    // fallback: place anyway near center with jitter
    return new Tank(w * 0.5 + (Math.random() - 0.5) * 40, h * 0.5 + (Math.random() - 0.5) * 40, color);
  }

  update(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (const tank of this.tanks) {
      tank.update(dt, w, h, this.tanks);
    }

    // body-body hits → both explode
    const n = this.tanks.length;
    for (let i = 0; i < n; i++) {
      const a = this.tanks[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.tanks[j];
        if (b.dead) continue;
        if (rectInRect(a.getHitRect(), b.getHitRect())) {
          a.dead = true;
          b.dead = true;
          this.explosions.push(new Explosion(a.x, a.y, a.color));
          this.explosions.push(new Explosion(b.x, b.y, b.color));
        }
      }
    }

    this.tanks = this.tanks.filter((t) => !t.dead);

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
