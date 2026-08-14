/**
 * Game - owns the canvas context and tank objects
 */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tanks = [];

    // start with one tank near center (will be adjusted after first resize)
    this.tanks.push(new Tank(200, 200, '#4caf50'));
  }

  update(dt) {
    for (const tank of this.tanks) {
      tank.update(dt);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);

    // draw tanks
    for (const tank of this.tanks) {
      tank.draw(ctx);
    }
  }

  addTank(x, y, color) {
    this.tanks.push(new Tank(x, y, color));
  }
}
