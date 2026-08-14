/**
 * Tank - drive, avoid, laser cannon.
 * Hit box is body only (no turret).
 */
class Tank {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.color = color;
    this.fillColor = shadeColor(color, 0.4);
    this.angle = Math.random() * Math.PI * 2;

    this.speed = 70;
    this.turnSpeed = 2.4;
    this.driveDir = 1;

    this.steerTarget = this.angle;
    this.aiTimer = 0;
    this.dead = false;

    // laser cannon
    this.laserDuration = 0.5; // 500ms default
    this.laserTimer = 0;      // remaining active time
    this.laserCooldown = 1 + Math.random() * 3; // seconds until may fire again
    this.laserEndX = x;
    this.laserEndY = y;
  }

  get laserActive() {
    return this.laserTimer > 0;
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

  /** Muzzle point at end of barrel. */
  getMuzzle() {
    const len = this.w / 2 + 8;
    return {
      x: this.x + Math.cos(this.angle) * len,
      y: this.y + Math.sin(this.angle) * len
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
    let speedScale = 1;
    let turningHard = false;

    // wander
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.8 + Math.random() * 2.2;
      this.steerTarget = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
    }

    // walls
    const margin = 70;
    let pushX = 0;
    let pushY = 0;
    if (this.x < margin) pushX = 1;
    else if (this.x > worldW - margin) pushX = -1;
    if (this.y < margin) pushY = 1;
    else if (this.y > worldH - margin) pushY = -1;

    const nearWall = pushX !== 0 || pushY !== 0;
    if (nearWall) {
      this.steerTarget = Math.atan2(pushY, pushX);
      turningHard = true;
      const intoWall =
        Math.cos(this.angle) * -pushX + Math.sin(this.angle) * -pushY > 0.25;
      if (intoWall) this.driveDir = -1;
    }

    // tank avoidance
    const avoidRadius = 95;
    const minSafe = 42;
    let avoidX = 0;
    let avoidY = 0;
    let minDist = Infinity;
    let neighbors = 0;

    for (const other of tanks) {
      if (other === this || other.dead) continue;
      const look = 12;
      const ox = other.x + Math.cos(other.angle) * other.driveDir * look;
      const oy = other.y + Math.sin(other.angle) * other.driveDir * look;
      const dx = this.x - ox;
      const dy = this.y - oy;
      const dist = Math.hypot(dx, dy);
      if (dist < avoidRadius && dist > 0.001) {
        const t = (avoidRadius - dist) / avoidRadius;
        const strength = t * t * 2.5;
        avoidX += (dx / dist) * strength;
        avoidY += (dy / dist) * strength;
        neighbors++;
        if (dist < minDist) minDist = dist;
      }
    }

    if (neighbors > 0) {
      turningHard = true;
      if (!nearWall) {
        this.steerTarget = Math.atan2(avoidY, avoidX);
      } else {
        const wx = Math.cos(this.steerTarget) * 1.2;
        const wy = Math.sin(this.steerTarget) * 1.2;
        this.steerTarget = Math.atan2(wy + avoidY, wx + avoidX);
      }
      if (minDist < avoidRadius) {
        speedScale = Math.max(0.25, minDist / avoidRadius);
      }
      if (minDist < minSafe) {
        this.driveDir = -1;
        speedScale = 1;
      }
    }

    // rotate
    let diff = this.steerTarget - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnRate = this.turnSpeed * (turningHard ? 1.6 : 1);
    const maxTurn = turnRate * dt;
    if (Math.abs(diff) <= maxTurn) this.angle = this.steerTarget;
    else this.angle += Math.sign(diff) * maxTurn;

    // move
    this.x += Math.cos(this.angle) * this.speed * speedScale * this.driveDir * dt;
    this.y += Math.sin(this.angle) * this.speed * speedScale * this.driveDir * dt;

    const pad = 14;
    this.x = Math.max(pad, Math.min(worldW - pad, this.x));
    this.y = Math.max(pad, Math.min(worldH - pad, this.y));

    // --- laser ---
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      const muzzle = this.getMuzzle();
      const edge = rayToCanvasEdge(muzzle.x, muzzle.y, this.angle, worldW, worldH);
      this.laserEndX = edge.x;
      this.laserEndY = edge.y;
    } else {
      this.laserCooldown -= dt;
      if (this.laserCooldown <= 0) {
        // random fire decision
        if (Math.random() < 0.35) {
          this.laserTimer = this.laserDuration;
          const muzzle = this.getMuzzle();
          const edge = rayToCanvasEdge(muzzle.x, muzzle.y, this.angle, worldW, worldH);
          this.laserEndX = edge.x;
          this.laserEndY = edge.y;
        }
        this.laserCooldown = 1.5 + Math.random() * 3.5;
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;

    // laser beam under / with tank
    if (this.laserActive) {
      const muzzle = this.getMuzzle();
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(muzzle.x, muzzle.y);
      ctx.lineTo(this.laserEndX, this.laserEndY);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    ctx.fillStyle = this.fillColor;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.fillStyle = this.color;
    ctx.fillRect(0, -3, this.w / 2 + 8, 6);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -3, this.w / 2 + 8, 6);

    ctx.restore();
  }
}
