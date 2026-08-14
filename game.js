/**
 * Game - tanks, lasers, collisions, explosions, respawn
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];
    this.explosions = [];

    this.colors = [
      '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
      '#00bcd4', '#ffeb3b', '#f44336', '#8bc34a', '#3f51b5'
    ];
    this.startCount = 60;

    const w = Math.max(canvas.width, 1);
    const h = Math.max(canvas.height, 1);
    const margin = 80;

    for (let i = 0; i < this.startCount; i++) {
      const x = margin + Math.random() * Math.max(1, w - margin * 2);
      const y = margin + Math.random() * Math.max(1, h - margin * 2);
      this.tanks.push(new Tank(x, y, this.colors[i % this.colors.length]));
    }
  }

  _spawnChance() {
    const n = this.tanks.length;
    const lo = this.startCount * 0.5;  // 100% at or below
    const hi = this.startCount * 1.1;  // 0% at or above
    if (n >= hi) return 0;
    if (n <= lo) return 1;
    return (hi - n) / (hi - lo);
  }

  _trySpawn(dt) {
    const chance = this._spawnChance();
    if (chance <= 0) return;
    // at chance=1, about 1 spawn per second
    if (Math.random() < chance * dt) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const margin = 80;
      const x = margin + Math.random() * Math.max(1, w - margin * 2);
      const y = margin + Math.random() * Math.max(1, h - margin * 2);
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      this.tanks.push(new Tank(x, y, color));
    }
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

    // laser hits → target explodes
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
          target.dead = true;
          this.explosions.push(new Explosion(target.x, target.y, target.color));
        }
      }
    }

    this.tanks = this.tanks.filter((t) => !t.dead);

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
