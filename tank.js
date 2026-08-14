/**
 * Tank - drive, scored AI, laser energy.
 * States: engage | forage | wander (utility scores + hysteresis).
 * Hit box = body only. Must stop while beam is active.
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

    this.energy = Math.random() * 2500;
    this.fireCost = 5000;
    this.rechargeRate = 500;
    this.beamDuration = 0.5;
    this.beamTimer = 0;
    this.laserEndX = x;
    this.laserEndY = y;

    this.state = 'wander';
    this.aiTarget = null;
    this.aiPickTimer = 0;
  }

  get laserActive() {
    return this.beamTimer > 0;
  }

  addEnergy(amount) {
    this.energy += amount;
  }

  tryFire(worldW, worldH) {
    if (this.beamTimer > 0 || this.energy < this.fireCost) return false;
    this.energy -= this.fireCost;
    this.beamTimer = this.beamDuration;
    this._updateBeamEnd(worldW, worldH);
    return true;
  }

  _updateBeamEnd(worldW, worldH) {
    const muzzle = this.getMuzzle();
    const edge = rayToCanvasEdge(muzzle.x, muzzle.y, this.angle, worldW, worldH);
    this.laserEndX = edge.x;
    this.laserEndY = edge.y;
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
    const edge = rayToCanvasEdge(muzzle.x, muzzle.y, this.angle, worldW, worldH);
    let best = null;
    let bestDist = Infinity;
    for (const other of tanks) {
      if (other === this || other.dead) continue;
      if (!lineInRect(muzzle.x, muzzle.y, edge.x, edge.y, other.getHitRect())) continue;
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

  /**
   * Pick a pod that isn't hopelessly contested.
   * Prefers same-color, skips pods where others are clearly closer.
   */
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
      // score: lower is better for sorting pick
      const score = (c) =>
        c.dist +
        c.rivalsCloser * 90 -
        (c.same ? 40 : 0) +
        (c.rivalsCloser >= 2 ? 120 : 0);
      return score(a) - score(b);
    });

    const best = candidates[0];
    // if still heavily contested, signal that
    return best;
  }

  selectState(tanks, items, worldW, worldH) {
    const canFire = this.energy >= this.fireCost;
    const energyFrac = this.energy / this.fireCost;
    const sight = this.findSightTarget(tanks, worldW, worldH);
    const near = this.nearestEnemy(tanks);
    const podInfo = this.pickPod(items, tanks);

    const scores = {
      wander: 10,
      engage: 0,
      forage: 0
    };

    if (canFire) {
      if (sight) {
        scores.engage =
          55 + Math.min(30, 400 / (Math.hypot(sight.x - this.x, sight.y - this.y) + 1));
      } else if (near && near.dist < 280) {
        scores.engage = 28 + (1 - near.dist / 280) * 20;
      }

      // rival beating us to a pod → shoot them instead of racing
      if (podInfo && podInfo.closestRival && podInfo.rivalsCloser > 0) {
        const rival = podInfo.closestRival;
        const rd = Math.hypot(rival.x - this.x, rival.y - this.y);
        if (rd < 320) {
          scores.engage = Math.max(
            scores.engage,
            40 + (1 - rd / 320) * 25 + podInfo.rivalsCloser * 8
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

      // contested pods are much less attractive
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
      // prefer rival on our pod, then LOS, then nearest
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

    if (this.beamTimer > 0) {
      this.beamTimer -= dt;
      this._updateBeamEnd(worldW, worldH);
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
        this.tryFire(worldW, worldH);
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

    if (this.laserActive) {
      const muzzle = this.getMuzzle();
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.95;
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
