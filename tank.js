/**
 * Tank - drives forward, rotates to change direction.
 * Reverse only when avoiding walls or other tanks.
 * All movement and AI live here.
 */
class Tank {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.color = color;
    this.fillColor = Tank.shade(color, 0.2);
    this.angle = Math.random() * Math.PI * 2;

    this.speed = 70;       // px/s nominal
    this.turnSpeed = 1.8;  // rad/s
    this.driveDir = 1;     // 1 forward, -1 reverse (avoid only)

    this.steerTarget = this.angle;
    this.aiTimer = 0;
  }

  /** Darken a #rrggbb color by factor (0–1). */
  static shade(hex, factor) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const g = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    return `rgb(${r},${g},${b})`;
  }

  /**
   * @param {number} dt
   * @param {number} worldW
   * @param {number} worldH
   * @param {Tank[]} tanks
   */
  update(dt, worldW, worldH, tanks) {
    // default: always forward for normal driving
    this.driveDir = 1;

    // random wander (forward only)
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.8 + Math.random() * 2.2;
      this.steerTarget = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
    }

    // --- wall avoidance ---
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
      // reverse if currently facing deeper into the wall
      const intoWall =
        Math.cos(this.angle) * -pushX + Math.sin(this.angle) * -pushY > 0.3;
      if (intoWall) this.driveDir = -1;
    }

    // --- tank avoidance ---
    const avoidRadius = 58;
    let avoidX = 0;
    let avoidY = 0;
    let minDist = Infinity;
    for (const other of tanks) {
      if (other === this) continue;
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
      // wall still has priority if both fire; blend slightly toward avoid
      if (!nearWall) {
        this.steerTarget = Math.atan2(avoidY, avoidX);
      } else {
        // blend away-from-tanks with away-from-wall
        const wx = Math.cos(this.steerTarget);
        const wy = Math.sin(this.steerTarget);
        this.steerTarget = Math.atan2(wy + avoidY, wx + avoidX);
      }
      // reverse when very close (stacked / colliding)
      if (minDist < 34) this.driveDir = -1;
    }

    // rotate toward steerTarget
    let diff = this.steerTarget - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxTurn = this.turnSpeed * dt;
    if (Math.abs(diff) <= maxTurn) this.angle = this.steerTarget;
    else this.angle += Math.sign(diff) * maxTurn;

    // drive
    this.x += Math.cos(this.angle) * this.speed * this.driveDir * dt;
    this.y += Math.sin(this.angle) * this.speed * this.driveDir * dt;

    // hard clamp
    const pad = 12;
    this.x = Math.max(pad, Math.min(worldW - pad, this.x));
    this.y = Math.max(pad, Math.min(worldH - pad, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // body: deep fill (20%), outline in full color
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // turret / barrel: full color
    ctx.fillStyle = this.color;
    ctx.fillRect(0, -3, this.w / 2 + 8, 6);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -3, this.w / 2 + 8, 6);

    ctx.restore();
  }
}
