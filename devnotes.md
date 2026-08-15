# Tanko — dev notes

Handoff notes for a new iteration of Grok (or any human) continuing this project.

## Project

- **Repo:** `justbobonx/tanko` (GitHub Pages)
- **Stack:** static multi-file canvas game — no build step
- **Entry:** `index.html` loads scripts with `?v=N` cache-bust (**bump on every meaningful push**)

## Files

| File | Role |
|------|------|
| `util.js` | `rectInRect`, `lineInRect`, `shadeColor`, `laserRange` (½ canvas width), `rayEnd` |
| `tank.js` | Movement, scored AI, energy, `pendingShot`, `fireLock` |
| `game.js` | Lists, spawn, bumps, shot resolve, kill → pod + explosion |
| `item.js` | `Item` / `EnergyPod` |
| `explosion.js` | Death VFX |
| `laser.js` | Beam **visual only** (500ms), not the hit logic |

## Important design splits

- **Shot damage:** one frame — `pendingShot` → closest `lineInRect` hit → kill → clear shot
- **Beam look:** separate `LaserBeam` for full 500ms
- **Tank “firing”:** `fireLock = 0.5` — no move/turn while locked
- **Body overlap:** push apart (angled shear), **do not** explode
- **Only lasers kill**

## AI

- Utility scores + hysteresis: `engage` / `forage` / `wander`
- Engage only when `energy >= fireCost`
- Sight = facing ray of length `laserRange(worldW)`, not infinite
- Contested pods lower forage; rivals can push engage instead

## Energy

- `fireCost = 5000`, `rechargeRate = 500`
- Spawn at **full** energy
- Pods: same color +2000, other +1000

## Spawn

- Target ~60; edge-only respawn; skip if overlapping
- Aggressive rate (`spawnRate ~ 8/s` + deficit burst) so population keeps up

## Workflow notes for next Grok

1. Always **read files before edit**; push via GitHub connector
2. Bump `?v=` in `index.html` with code changes
3. Pages still lags 1–3 min; local clone + open `index.html` is faster for iteration
4. Don’t reintroduce continuous beam damage or body-explode without an explicit ask
5. Prefer small targeted pushes over rewriting whole files when possible

## Fragile / easy to break

- Forage pile-on vs engage balance (weights, not structure)
- Spawn vs edge crowding (clear placement can fail)
- AI “silly shots” fixed by range — don’t restore full-map rays casually

## Good next ideas (if they ask)

- Player-controlled tank
- Team/faction scoring
- Obstacles blocking `lineInRect`
- Visible energy bar
- Tuning panel / debug draw for LOS and scores

That’s enough for a cold start to keep building instead of re-deriving the combat model.
