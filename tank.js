/**
 * Tank - drive, scored AI, laser/bullet energy.
 * Laser: one-frame resolve via pendingShot + LaserBeam visual.
 * Bullets: independent flying objects (pendingBullets handed to Game).
 * Tank locks movement for fireDuration while firing.
 * Sight range still half canvas width (laser-oriented).
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
    this.dead = false;

    // laser cost kept as fireCost so selectState is unchanged
    this.fireCost = 5000;
    this.bulletCost = 250;
    this.rechargeRate = 500;
    this.fireDuration = 0.5;
    this.fireLock = 0;
    // full energy on spawn so they can shoot immediately
    this.energy = this.fireCost;

    this.pendingShot = null;
    this.pendingBullets = null;

    this.state = 'wander';
    this.aiTarget = null;
    this.aiPickTimer = 0;
  }

  addEnergy(amount) {
    this.energy += amount;
  }

  /**
   * Instant laser (existing behaviour). Sets pendingShot for Game to resolve.
   */
  shootLaser() {
    if (this.fireLock > 0 || this.pendingShot || this.pendingBullets || this.energy < this.fireCost) {
      return false;
    }
    this.energy -= this.fireCost;
    this.fireLock = this.fireDuration;
    const muzzle = this.getMuzzle();
    this.pendingShot = {
      x: muzzle.x,
      y: muzzle.y,
      angle: this.angle,
      color: this.color
    };
    return true;
  }

  /**
   * Burst of 3–5 bullets. Each costs bulletCost. Handed to Game via pendingBullets.
   */
  shootBullet() {
    const count = 3 + Math.floor(Math.random() * 3); // 3–5
    const totalCost = this.bulletCost * count;
    if (this.fireLock > 0 || this.pendingShot || this.pendingBullets || this.energy < totalCost) {
      return false;
    }
    this.energy -= totalCost;
    this.fireLock = this.fireDuration;
    const muzzle = this.getMuzzle();
    this.pendingBullets = [];
    for (let i = 0; i < count; i++) {
      // tiny random spread so the burst is not a single pixel stack
      const spread = (Math.random() - 0.5) * 0.1;
      this.pendingBullets.push(
        new Bullet(muzzle.x, muzzle.y, this.angle + spread, this.color, this)
      );
    }
    return true;
  }

  getHitRect() {
    return {
      x: this.x - this.w / 2,
      y: this.y - this.h / 2,
      w: this.w,
      h: this.h
    };
  }

  getMuzzle() {
    const len = this.w / 2 + 8;
    return {
      x: this.x + Math.cos(this.angle) * len,
      y: this.y + Math.sin(this.angle) * len
    };
  }

  findSightTarget(tanks, worldW, worldH) {
    const muzzle = this.getMuzzle();
    const end = rayEnd(
      muzzle.x,
      muzzle.y,
      this.angle,
      worldW,
      worldH,
      laserRange(worldW)
    );
    let best = null;
    let bestDist = Infinity;
    for (const other of tanks) {
      if (other === this || other.dead) continue;
      if (!lineInRect(muzzle.x, muzzle.y, end.x, end.y, other.getHitRect())) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return best;
  }

  nearestEnemy(tanks) {
    let best = null;
    let bestDist = Infinity;
    for (const other of tanks) {
      if (other === this || other.dead) continue;
      const d = Math.hypot(other.x - this.x, other.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = other;
      }
    }
    return best ? { tank: best, dist: bestDist } : null;
  }

  pickPod(items, tanks) {
    const candidates = [];
    for (const item of items) {
      if (item.dead) continue;
      const dist = Math.hypot(item.x - this.x, item.y - this.y);
      let rivalsCloser = 0;
      let closestRival = null;
      let closestRivalDist = Infinity;
      for (const other of tanks) {
        if (other === this || other.dead) continue;
        const od = Math.hypot(item.x - other.x, item.y - other.y);
        if (od + 8 < dist) {
          rivalsCloser++;
          if (od < closestRivalDist) {
            closestRivalDist = od;
            closestRival = other;
          }
        }
      }
      const same =
        item.color && item.color.toLowerCase() === this.color.toLowerCase();
      candidates.push({
        item,
        dist,
        rivalsCloser,
        closestRival,
        same
      });
    }
    if (!candidates.length) return null;

    candidates.sort((a, b) => {
      const score = (c) =>
        c.dist +
        c.rivalsCloser * 90 -
        (c.same ? 40 : 0) +
        (c.rivalsCloser >= 2 ? 120 : 0);
      return score(a) - score(b);
    });

    return candidates[0];
  }

  selectState(tanks, items, worldW, worldH) {
    const canFire = this.energy >= this.fireCost;
    const energyFrac = this.energy / this.fireCost;
    const sight = this.findSightTarget(tanks, worldW, worldH);
    const near = this.nearestEnemy(tanks);
    const podInfo = this.pickPod(items, tanks);
    const range = laserRange(worldW);

    const scores = {
      wander: 10,
      engage: 0,
      forage: 0
    };

    if (canFire) {
      if (sight) {
        scores.engage =
          55 + Math.min(30, 400 / (Math.hypot(sight.x - this.x, sight.y - this.y) + 1));
      } else if (near && near.dist < Math.min(280, range)) {
        scores.engage = 28 + (1 - near.dist / Math.min(280, range)) * 20;
      }

      if (podInfo && podInfo.closestRival && podInfo.rivalsCloser > 0) {
        const rival = podInfo.closestRival;
        const rd = Math.hypot(rival.x - this.x, rival.y - this.y);
        if (rd < Math.min(320, range)) {
          scores.engage = Math.max(
            scores.engage,
            40 + (1 - rd / Math.min(320, range)) * 25 + podInfo.rivalsCloser * 8
          );
        }
      }
    } else if (sight || (near && near.dist < 200)) {
      scores.engage = 2;
    }

    if (podInfo) {
      const need = energyFrac < 1 ? 1 - Math.min(1, energyFrac) : 0.08;
      let forage =
        8 + need * 28 + Math.max(0, 16 - podInfo.dist / 45);

      if (podInfo.rivalsCloser >= 1) forage *= 0.45;
      if (podInfo.rivalsCloser >= 2) forage *= 0.5;
      if (podInfo.same) forage += 6;
      if (!canFire) forage += 10;
      if (energyFrac < 0.4) forage += 8;

      scores.forage = forage;
    }

    if (scores[this.state] !== undefined) scores[this.state] += 10;

    let best = 'wander';
    let bestScore = -Infinity;
    for (const k of Object.keys(scores)) {
      if (scores[k] > bestScore) {
        bestScore = scores[k];
        best = k;
      }
    }

    this.state = best;
    if (best === 'engage') {
      if (
        canFire &&
        podInfo &&
        podInfo.closestRival &&
        !podInfo.closestRival.dead &&
        scores.engage >= 40
      ) {
        this.aiTarget = podInfo.closestRival;
      } else {
        this.aiTarget = sight || (near ? near.tank : null);
      }
    } else if (best === 'forage') {
      this.aiTarget = podInfo ? podInfo.item : null;
    } else {
      this.aiTarget = null;
    }
  }

  _steerToward(tx, ty, hard) {
    this.steerTarget = Math.atan2(ty - this.y, tx - this.x);
    return hard;
  }

  _applySteerAndMove(dt, worldW, worldH, tanks, turningHard, speedScale) {
    const margin = 70;
    let pushX = 0;
    let pushY = 0;
    if (this.x < margin) pushX = 1;
    else if (this.x > worldW - margin) pushX = -1;
    if (this.y < margin) pushY = 1;
    else if (this.y > worldH - margin) pushY = -1;

    if (pushX !== 0 || pushY !== 0) {
      this.steerTarget = Math.atan2(pushY, pushX);
      turningHard = true;
      const intoWall =
        Math.cos(this.angle) * -pushX + Math.sin(this.angle) * -pushY > 0.25;
      if (intoWall) this.driveDir = -1;
    }

    const avoidRadius = 70;
    let avoidX = 0;
    let avoidY = 0;
    let neighbors = 0;
    for (const other of tanks) {
      if (other === this || other.dead) continue;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist < avoidRadius && dist > 0.001) {
        const t = (avoidRadius - dist) / avoidRadius;
        avoidX += (dx / dist) * t * t;
        avoidY += (dy / dist) * t * t;
        neighbors++;
      }
    }
    if (neighbors > 0 && pushX === 0 && pushY === 0) {
      const wx = Math.cos(this.steerTarget);
      const wy = Math.sin(this.steerTarget);
      this.steerTarget = Math.atan2(wy + avoidY * 0.8, wx + avoidX * 0.8);
    }

    let diff = this.steerTarget - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const turnRate = this.turnSpeed * (turningHard ? 1.6 : 1);
    const maxTurn = turnRate * dt;
    if (Math.abs(diff) <= maxTurn) this.angle = this.steerTarget;
    else this.angle += Math.sign(diff) * maxTurn;

    this.x += Math.cos(this.angle) * this.speed * speedScale * this.driveDir * dt;
    this.y += Math.sin(this.angle) * this.speed * speedScale * this.driveDir * dt;

    const pad = 14;
    this.x = Math.max(pad, Math.min(worldW - pad, this.x));
    this.y = Math.max(pad, Math.min(worldH - pad, this.y));
  }

  update(dt, worldW, worldH, tanks, items) {
    if (this.dead) return;
    if (!items) items = [];

    if (this.fireLock > 0) {
      this.fireLock -= dt;
      this.energy += this.rechargeRate * dt;
      return;
    }

    this.energy += this.rechargeRate * dt;

    this.aiPickTimer -= dt;
    if (this.aiPickTimer <= 0) {
      this.aiPickTimer = 0.2 + Math.random() * 0.15;
      this.selectState(tanks, items, worldW, worldH);
    }

    this.driveDir = 1;
    let speedScale = 1;
    let turningHard = false;

    if (this.state === 'engage' && this.aiTarget && !this.aiTarget.dead) {
      const t = this.aiTarget;
      turningHard = this._steerToward(t.x, t.y, true);

      let angErr = Math.atan2(t.y - this.y, t.x - this.x) - this.angle;
      while (angErr > Math.PI) angErr -= Math.PI * 2;
      while (angErr < -Math.PI) angErr += Math.PI * 2;

      const sight = this.findSightTarget(tanks, worldW, worldH);
      if (Math.abs(angErr) < 0.12 && sight && this.energy >= this.fireCost) {
        // temporarily using bullets instead of laser
        this.shootBullet();
        return;
      }
      speedScale = 0.85;
    } else if (this.state === 'forage' && this.aiTarget && !this.aiTarget.dead) {
      const p = this.aiTarget;
      turningHard = this._steerToward(p.x, p.y, true);
      speedScale = 1;
    } else {
      if (!this._wanderT) this._wanderT = 0;
      this._wanderT -= dt;
      if (this._wanderT <= 0) {
        this._wanderT = 0.8 + Math.random() * 2.2;
        this.steerTarget = this.angle + (Math.random() - 0.5) * Math.PI * 1.2;
      }
    }

    this._applySteerAndMove(dt, worldW, worldH, tanks, turningHard, speedScale);
  }

  draw(ctx) {
    if (this.dead) return;

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
