/**
 * Base collectible
 */
class Item {
  constructor(x, y, color = '#ffffff') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.w = 14;
    this.h = 14;
    this.dead = false;
  }

  getHitRect() {
    return {
      x: this.x - this.w / 2,
      y: this.y - this.h / 2,
      w: this.w,
      h: this.h
    };
  }

  update(dt) {
    // base: nothing
  }

  draw(ctx) {
    // override
  }

  /** Apply effect to tank; return true if consumed. */
  onPickup(tank) {
    return true;
  }
}

/**
 * Energy pod — diamond drop from a destroyed tank.
 * Same color as tank: +2000ms charge. Other color: +1000ms.
 */
class EnergyPod extends Item {
  constructor(x, y, color) {
    super(x, y, color);
    this.w = 12;
    this.h = 12;
  }

  onPickup(tank) {
    const same = tank.color.toLowerCase() === this.color.toLowerCase();
    const boostMs = same ? 2000 : 1000;
    tank.addLaserEnergy(boostMs);
    return true;
  }

  draw(ctx) {
    const s = this.w / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
