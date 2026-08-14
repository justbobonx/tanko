/**
 * Tank - drives forward/back, rotates to change direction.
 * All movement and AI live here.
 */
class Tank {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.color = color;
    this.angle = Math.random() * Math.PI * 2;

    // tank-like motion
    this.speed = 70;          // px/s nominal
    this.turnSpeed = 1.8;     // rad/s
    this.driveDir = 1;        // 1 = forward, -1 = reverse

    // AI wander
    this.steerTarget = this.angle;
    this.aiTimer = 0;
  }

  /**
   * @param {number} dt seconds
   * @param {number} worldW canvas width
   * @param {number} worldH canvas height
   */
  update(dt, worldW, worldH) {
    // random wander: pick a new heading now and then
    this.aiTimer -= dt;
    if (this.aiTimer <= 0) {
      this.aiTimer = 0.8 + Math.random() * 2.2;
      this.steerTarget = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
      // mostly drive forward; occasional reverse
      this.driveDir = Math.random() < 0.12 ? -1 : 1;
    }

    // steer back in from edges (overrides wander while near boundary)
    const margin = 60;
    let pushX = 0;
    let pushY = 0;
    if (this.x < margin) pushX = 1;
    else if (this.x > worldW - margin) pushX = -1;
    if (this.y < margin) pushY = 1;
    else if (this.y > worldH - margin) pushY = -1;

    if (pushX !== 0 || pushY !== 0) {
      this.steerTarget = Math.atan2(pushY, pushX);
      this.driveDir = 1;
    }

    // rotate toward steerTarget (shortest path)
    let diff = this.steerTarget - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const maxTurn = this.turnSpeed * dt;
    if (Math.abs(diff) <= maxTurn) {
      this.angle = this.steerTarget;
    } else {
      this.angle += Math.sign(diff) * maxTurn;
    }

    // drive along facing direction
    this.x += Math.cos(this.angle) * this.speed * this.driveDir * dt;
    this.y += Math.sin(this.angle) * this.speed * this.driveDir * dt;

    // hard clamp so they never leave the page
    const pad = 12;
    this.x = Math.max(pad, Math.min(worldW - pad, this.x));
    this.y = Math.max(pad, Math.min(worldH - pad, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // body
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // barrel (points along +x after rotate)
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -3, this.w / 2 + 8, 6);

    // outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }
}
