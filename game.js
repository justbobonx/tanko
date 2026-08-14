/**
 * Game - owns the canvas context and tank objects
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];

    const colors = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0'];
    const count = 5;

    // spawn after a short delay isn't needed; positions use current canvas size
    // (resize happens before first frame in index.html)
    for (let i = 0; i < count; i++) {
      const x = 80 + Math.random() * Math.max(40, canvas.width - 160);
      const y = 80 + Math.random() * Math.max(40, canvas.height - 160);
      this.tanks.push(new Tank(x, y, colors[i % colors.length]));
    }
  }

  update(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    for (const tank of this.tanks) {
      tank.update(dt, w, h);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    for (const tank of this.tanks) {
      tank.draw(ctx);
    }
  }

  addTank(x, y, color) {
    this.tanks.push(new Tank(x, y, color));
  }
}
