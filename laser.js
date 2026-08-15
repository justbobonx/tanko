/**
 * Visual-only laser beam effect.
 * Spawned at fire time from muzzle to impact (or canvas edge).
 * Lasts full duration even though the shot resolves instantly.
 */
class LaserBeam {
  constructor(x1, y1, x2, y2, color, duration = 0.5) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = color;
    this.life = duration;
    this.maxLife = duration;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const t = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 + 0.6 * t;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
