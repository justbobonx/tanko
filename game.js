/**
 * Game - owns the canvas context and tank objects
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];

    const colors = [
      '#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0',
      '#00bcd4', '#ffeb3b', '#f44336', '#8bc34a', '#3f51b5'
    ];
    const count = 10;

    // Canvas must already be sized (see index.html) so width/height are real
    const w = Math.max(canvas.width, 1);
    const h = Math.max(canvas.height, 1);
    const margin = 80;

    for (let i = 0; i < count; i++) {
      const x = margin + Math.random() * Math.max(1, w - margin * 2);
      const y = margin + Math.random() * Math.max(1, h - margin * 2);
      this.tanks.push(new Tank(x, y, colors[i % colors.length]));
    }
  }

  update(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const tank of this.tanks) {
      tank.update(dt, w, h, this.tanks);
    }
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
  }

  addTank(x, y, color) {
    this.tanks.push(new Tank(x, y, color));
  }
}
