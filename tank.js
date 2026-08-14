/**
 * Tank - drives forward, rotates to change direction.
 * Reverse only when avoiding walls or other tanks.
 * Hit box is body only (no turret).
 */
class Tank {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.color = color;
    this.fillColor = shadeColor(color, 0.3);
    this.angle = Math.random() * Math.PI * 2;

    this.speed = 70;
    this.turnSpeed = 1.8;
    this.driveDir = 1;

    this.steerTarget = this.angle;
    this.aiTimer = 0;
    this.dead = false;
  }

  /** Axis-aligned body rect (ignores rotation and turret). */
  getHitRect() {
    return {
      x: this.x - this.w / 2,
      y: this.y - this.h / 2,
      w: this.w,
      h: this.h
    };
  }

  /**
   * @param {number} dt
   * @param {number} worldW
   * @param {number} worldH
   * @param {Tank[]} tanks
   */
  update(dt, worldW, worldH, tanks) {
    if (this.dead) return;

    this.driveDir = 1;

    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.8 + Math.random() * 2.2;
      this.steerTarget = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
    }

    const margin = 60;
    let pushX = 0;
    let pushY = 0;
    if (this.x < margin) pushX = 1;
    else if (this.x > worldW - margin) pushX = -1;
    if (this.y < margin) pushY = 1;
    else if (this.y > worldH - margin) pushY = -1;

    const nearWall = pushX !== 0 || pushY !== 0;
    if (nearWall) {
      this.steerTarget = Math.atan2(pushY, pushX);
      const intoWall =
        Math.cos(this.angle) * -pushX + Math.sin(this.angle) * -pushY > 0.3;
      if (intoWall) this.driveDir = -1;
    }

    const avoidRadius = 58;
    let avoidX = 0;
    let avoidY = 0;
    let minDist = Infinity;
    for (const other of tanks) {
      if (other === this || other.dead) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist < avoidRadius && dist > 0.001) {
        const strength = (avoidRadius - dist) / avoidRadius;
        avoidX += (dx / dist) * strength;
        avoidY += (dy / dist) * strength;
        if (dist < minDist) minDist = dist;
      }
    }

    if (avoidX !== 0 || avoidY !== 0) {
      if (!nearWall) {
        this.steerTarget = Math.atan2(avoidY, avoidX);
      } else {
        const wx = Math.cos(this.steerTarget);
        const wy = Math.sin(this.steerTarget);
        this.steerTarget = Math.atan2(wy + avoidY, wx + avoidX);
      }
      if (minDist < 34) this.driveDir = -1;
    }

    let diff = this.steerTarget - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxTurn = this.turnSpeed * dt;
    if (Math.abs(diff) <= maxTurn) this.angle = this.steerTarget;
    else this.angle += Math.sign(diff) * maxTurn;

    this.x += Math.cos(this.angle) * this.speed * this.driveDir * dt;
    this.y += Math.sin(this.angle) * this.speed * this.driveDir * dt;

    const pad = 12;
    this.x = Math.max(pad, Math.min(worldW - pad, this.x));
    this.y = Math.max(pad, Math.min(worldH - pad, this.y));
  }

  draw(ctx) {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // body: 30% fill, full-color outline
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // turret: full color
    ctx.fillStyle = this.color;
    ctx.fillRect(0, -3, this.w / 2 + 8, 6);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -3, this.w / 2 + 8, 6);

    ctx.restore();
  }
}
