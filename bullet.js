/**
 * Flying bullet projectile.
 * Moves independently; hit detection is continuous (line from previous to current position).
 * Speed is 3× tank speed (210).
 */
class Bullet {
  constructor(x, y, angle, color, owner = null, speed = 210) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.speed = speed;
    this.color = color;
    this.owner = owner;
    this.r = 3.5;
    this.life = 2.2; // seconds max
    this.dead = false;
    this._prevX = x;
    this._prevY = y;
  }

  update(dt, worldW, worldH) {
    if (this.dead) return;

    this._prevX = this.x;
    this._prevY = this.y;

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    if (
      this.life <= 0 ||
      this.x < -20 ||
      this.x > worldW + 20 ||
      this.y < -20 ||
      this.y > worldH + 20
    ) {
      this.dead = true;
    }
  }

  /** Axis-aligned rect for simple overlap if needed */
  getHitRect() {
    return {
      x: this.x - this.r,
      y: this.y - this.r,
      w: this.r * 2,
      h: this.r * 2
    };
  }

  draw(ctx) {
    if (this.dead) return;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
    // small trail-ish core
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
