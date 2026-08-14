/**
 * Spiked explosion — outline + fill from tank color, self-timed lifecycle.
 */
class Explosion {
  constructor(x, y, color = '#4caf50') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.fillColor = shadeColor(color, 0.3);
    this.age = 0;
    this.life = 0.5; // seconds
    this.spikes = 8;
    this.maxR = 40;
  }

  get dead() {
    return this.age >= this.life;
  }

  update(dt) {
    this.age += dt;
  }

  draw(ctx) {
    const t = Math.min(1, this.age / this.life);
    // expand quickly then hold outer edge while fading
    const grow = t < 0.35 ? t / 0.35 : 1;
    const outer = this.maxR * (0.25 + 0.75 * grow);
    const inner = outer * 0.45;
    const alpha = 1 - t;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = alpha;

    ctx.beginPath();
    for (let i = 0; i < this.spikes * 2; i++) {
      const ang = (i / (this.spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = this.fillColor;
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
