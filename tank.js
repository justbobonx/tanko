/**
 * Tank - simple square tank object
 */
class Tank {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 20;
    this.color = color;
    this.angle = 0; // radians, facing direction
  }

  update(dt) {
    // placeholder for movement / AI later
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // body
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

    // turret / barrel
    ctx.fillStyle = '#333';
    ctx.fillRect(0, -3, this.w / 2 + 8, 6);

    // outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(-this.w / 2, -this.h / 2, this.w, this.h);

    ctx.restore();
  }
}
