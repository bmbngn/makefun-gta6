// Everything the eye sees in Solmar Bay: the city from above, the cars
// and people in it, the dense heads-up display, the minimap, and every
// screen. The renderer only paints the world's state; it never changes
// it. Colours stay inside the golden-hour palette of config.js.
import { WORLD, PALETTE, FONT, MISSIONS, STORY } from './config.js';
import { onRoad } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_CARD = 'card';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_FAILED = 'failed';
export const SCREEN_COMPLETE = 'complete';

function star(cx, cy, r, color, ctx) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const w = canvas.clientWidth || 1280;
    const h = canvas.clientHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function drawCarShape(car, ghost) {
    const spec = car.spec;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.globalAlpha = ghost ? 0.5 : 1;
    ctx.fillStyle = 'rgba(40,26,12,0.3)';
    ctx.fillRect(-spec.length / 2 + 4, -spec.width / 2 + 4, spec.length, spec.width);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.roundRect(-spec.length / 2, -spec.width / 2, spec.length, spec.width, 8);
    ctx.fill();
    ctx.fillStyle = spec.roof;
    ctx.beginPath();
    ctx.roundRect(-spec.length / 2 + 10, -spec.width / 2 + 6, spec.length - 26, spec.width - 12, 5);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillRect(spec.length / 2 - 10, -spec.width / 2 + 3, 5, 8);
    ctx.fillRect(spec.length / 2 - 10, spec.width / 2 - 11, 5, 8);
    if (car.kind === 'police') {
      ctx.fillStyle = '#ff5a4e';
      ctx.fillRect(-6, -spec.width / 2 + 2, 12, 5);
      ctx.fillStyle = '#4f8ef7';
      ctx.fillRect(-6, spec.width / 2 - 7, 12, 5);
    }
    if (car.smoke) {
      ctx.fillStyle = 'rgba(120,120,120,0.7)';
      ctx.beginPath();
      ctx.arc(-spec.length / 2 - 4, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    if (car.fire) {
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.arc(-spec.length / 2 - 2, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(-spec.length / 2 - 2, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWorld(world) {
    const { state, city } = world;
    const p = state.player;
    const vw = canvas.width;
    const vh = canvas.height;
    let camX = p.x - vw / 2;
    let camY = p.y - vh / 2;
    camX = Math.max(0, Math.min(WORLD.width - vw, camX));
    camY = Math.max(0, Math.min(WORLD.height - vh, camY));
    if (state.shake > 0) {
      camX += (Math.random() - 0.5) * state.shake * 24;
      camY += (Math.random() - 0.5) * state.shake * 24;
    }
    const toScreen = (x, y) => ({ x: x - camX, y: y - camY });

    ctx.fillStyle = PALETTE.seaDeep;
    ctx.fillRect(0, 0, vw, vh);
    const sea = toScreen(0, 1760);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(0, Math.max(0, sea.y), vw, vh - Math.max(0, sea.y));
    const sand = toScreen(0, 1760);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, Math.max(0, sand.y), vw, 80);

    for (const park of city.parks) {
      const s = toScreen(park.x, park.y);
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(s.x, s.y, park.w, park.h);
    }
    const plaza = toScreen(city.plaza.x, city.plaza.y);
    ctx.fillStyle = PALETTE.plaza;
    ctx.fillRect(plaza.x, plaza.y, city.plaza.w, city.plaza.h);
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plaza.x + city.plaza.w / 2, plaza.y + city.plaza.h / 2, 40, 0, Math.PI * 2);
    ctx.stroke();

    for (let gx = 0; gx <= WORLD.width; gx += 320) {
      const a = toScreen(gx - 56, 0);
      const b = toScreen(gx + 56, 0);
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(a.x, 0, b.x - a.x, vh);
      const r = toScreen(gx - 32, 0);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(r.x, 0, 64, vh);
    }
    for (let gy = 0; gy <= WORLD.height; gy += 320) {
      const a = toScreen(0, gy - 56);
      const b = toScreen(0, gy + 56);
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(0, a.y, vw, b.y - a.y);
      const r = toScreen(0, gy - 32);
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(0, r.y, vw, 64);
    }
    ctx.fillStyle = PALETTE.roadLine;
    for (let gx = 320; gx < WORLD.width; gx += 320) {
      const s = toScreen(gx, 0);
      for (let y = 0; y < WORLD.height; y += 48) {
        const p2 = toScreen(gx, y);
        ctx.fillRect(s.x - 2, p2.y, 4, 24);
      }
    }
    for (let gy = 320; gy < WORLD.height; gy += 320) {
      for (let x = 0; x < WORLD.width; x += 48) {
        const p2 = toScreen(x, gy);
        ctx.fillRect(p2.x, p2.y - 2, 24, 4);
      }
    }

    for (const b of city.buildings) {
      const s = toScreen(b.x, b.y);
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(s.x + 8, s.y + 8, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(s.x, s.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(s.x + 6, s.y + 6, b.w - 12, 8);
      if (b.warehouse) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(s.x + 8, s.y + b.h / 2 - 6, b.w - 16, 12);
      }
      if (b.tall > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let i = 0; i < b.tall; i += 1) ctx.fillRect(s.x + 8 + i * 10, s.y + 14, 5, b.h - 28);
      }
    }
    for (const t of city.trees) {
      const s = toScreen(t.x, t.y);
      ctx.fillStyle = '#3f6b34';
      ctx.beginPath();
      ctx.arc(s.x, s.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6aa854';
      ctx.beginPath();
      ctx.arc(s.x - 2, s.y - 2, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const c of city.cranes) {
      const s = toScreen(c.x, c.y);
      ctx.strokeStyle = '#d9a05b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x, s.y - c.h);
      ctx.lineTo(s.x + 70, s.y - c.h);
      ctx.stroke();
    }
    const pier = toScreen(city.pier.x, city.pier.y);
    ctx.fillStyle = '#a9805a';
    ctx.fillRect(pier.x, pier.y, city.pier.w, city.pier.h);
    const boat = toScreen(city.boat.x, city.boat.y);
    ctx.fillStyle = '#e8ecf2';
    ctx.beginPath();
    ctx.ellipse(boat.x, boat.y, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b8dd9';
    ctx.fillRect(boat.x - 8, boat.y - 8, 16, 8);

    const named = [
      { r: city.safehouse, label: 'SAFEHOUSE', color: '#7ed491' },
      { r: city.paintShop, label: 'PAINT', color: '#f2c94c' },
      { r: city.policeStation, label: 'POLICE', color: '#4f8ef7' },
      { r: city.hospital, label: 'HOSPITAL', color: '#ff8a80' },
    ];
    for (const n of named) {
      const s = toScreen(n.r.x, n.r.y);
      if (n.label === 'SAFEHOUSE') {
        ctx.strokeStyle = n.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(s.x, s.y, n.r.w, n.r.h);
        ctx.setLineDash([]);
        ctx.fillStyle = '#c96f4a';
        ctx.fillRect(s.x + 18, s.y + 10, 60, 40);
      } else {
        ctx.fillStyle = '#6b5a3e';
        ctx.fillRect(s.x, s.y, n.r.w, n.r.h);
        ctx.fillStyle = n.color;
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, s.x + n.r.w / 2, s.y + n.r.h / 2 + 5);
      }
    }

    ctx.strokeStyle = 'rgba(30,20,10,0.5)';
    ctx.lineWidth = 2;
    for (const s of state.skids) {
      if (s.life <= 0) continue;
      const a = toScreen(s.x1, s.y1);
      const b = toScreen(s.x2, s.y2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const pk of state.pickups) {
      const s = toScreen(pk.x, pk.y);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5c00';
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', s.x, s.y + 4);
    }

    if (state.marker) {
      const m = state.marker;
      const pulse = 1 + Math.sin(state.time * 5) * 0.15;
      const s = toScreen(m.x, m.y);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd23e';
      const r = 14 * pulse;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = 2;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      ctx.fillStyle = '#ffd23e';
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(m.label, s.x, s.y - 24);
      const mx = s.x;
      const my = s.y;
      if (mx < 0 || mx > vw || my < 0 || my > vh) {
        const cx = Math.max(40, Math.min(vw - 40, mx));
        const cy = Math.max(40, Math.min(vh - 40, my));
        const ang = Math.atan2(my - vh / 2, mx - vw / 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    for (const car of state.cars) {
      if (car.police && state.time * 2 % 1 < 0.5) {
        const s = toScreen(car.x, car.y);
        ctx.fillStyle = 'rgba(255,90,78,0.25)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, 46, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(-camX, -camY);
      drawCarShape(car, false);
      ctx.restore();
    }
    for (const ped of state.peds) {
      if (ped.down > 0) continue;
      const s = toScreen(ped.x, ped.y);
      ctx.fillStyle = '#3a3f4a';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b04b';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const off of state.officers) {
      if (off.down > 0) continue;
      const s = toScreen(off.x, off.y);
      ctx.fillStyle = '#20242e';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4f8ef7';
      ctx.beginPath();
      ctx.arc(s.x, s.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.onFoot) {
      const s = toScreen(p.x, p.y);
      ctx.fillStyle = 'rgba(40,26,12,0.3)';
      ctx.beginPath();
      ctx.ellipse(s.x + 3, s.y + 4, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e5534b';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(p.angle) * 3, s.y + Math.sin(p.angle) * 3 - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.passenger) {
      const s = toScreen(p.x, p.y);
      ctx.fillStyle = '#b87a9e';
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('ILSA ABOARD', s.x, s.y - 22);
    }
    for (const pop of state.popups) {
      const s = toScreen(pop.x, pop.y);
      ctx.globalAlpha = Math.min(1, pop.life);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(pop.text, s.x, s.y);
      ctx.globalAlpha = 1;
    }
    return { camX, camY };
  }

  function drawMinimap(world, cam) {
    const { state, city } = world;
    const size = 168;
    const x0 = canvas.width - size - 12;
    const y0 = 12;
    const sx = size / WORLD.width;
    const sy = size / WORLD.height;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, size, size);
    ctx.clip();
    ctx.fillStyle = '#3a3428';
    ctx.fillRect(x0, y0, size, size);
    ctx.fillStyle = PALETTE.sea;
    ctx.fillRect(x0, y0 + 1760 * sy, size, size - 1760 * sy);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(x0, y0 + 1760 * sy - 6, size, 6);
    ctx.fillStyle = '#6b6258';
    for (let gx = 0; gx <= WORLD.width; gx += 320) ctx.fillRect(x0 + gx * sx - 1, y0, 2, size);
    for (let gy = 0; gy <= WORLD.height; gy += 320) ctx.fillRect(x0, y0 + gy * sy - 1, size, 2);
    ctx.fillStyle = '#8a7a5a';
    for (const b of city.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
    ctx.fillStyle = '#7ed491';
    ctx.fillRect(x0 + city.safehouse.x * sx, y0 + city.safehouse.y * sy, 4, 4);
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(x0 + city.paintShop.x * sx, y0 + city.paintShop.y * sy, 4, 4);
    for (const car of state.cars) {
      if (car.police) {
        ctx.fillStyle = '#ff5a4e';
        ctx.beginPath();
        ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (!car.parked) {
        ctx.fillStyle = '#9a938a';
        ctx.fillRect(x0 + car.x * sx - 1, y0 + car.y * sy - 1, 2, 2);
      }
    }
    if (state.marker) {
      const pulse = 1 + Math.sin(state.time * 5) * 0.3;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(x0 + state.marker.x * sx, y0 + state.marker.y * sy, 3 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = state.player;
    ctx.save();
    ctx.translate(x0 + p.x * sx, y0 + p.y * sy);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(city.districtAt(p.x, p.y).toUpperCase(), x0, y0 + size + 14);
  }

  function drawHud(world, best) {
    const { state } = world;
    const p = state.player;
    const vw = canvas.width;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(10, 10, 250, 86);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(10, 10, 250, 86);
    ctx.fillStyle = '#ff8a80';
    ctx.fillRect(20, 20, 150 * Math.max(0, p.health / 100), 12);
    ctx.strokeStyle = '#5a3a36';
    ctx.strokeRect(20, 20, 150, 12);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`HEALTH ${Math.ceil(p.health)}`, 178, 31);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`$${state.cash}`, 20, 62);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`SCORE ${state.score}`, 20, 84);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT}`;
    ctx.fillText(`BEST ${best}`, 130, 84);

    const cx = vw / 2;
    ctx.textAlign = 'center';
    for (let i = 0; i < 5; i += 1) {
      star(cx - 44 + i * 22, 26, 11, i < state.wanted ? '#ffd23e' : 'rgba(255,255,255,0.25)', ctx);
    }
    ctx.fillStyle = '#7ed491';
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(`WIN: ${state.mission ? state.mission.win : 'Free roam'}`, cx, 52);
    ctx.fillStyle = '#ff8a80';
    ctx.fillText(`LOSE: ${state.mission ? state.mission.lose : 'Busted or wasted'}`, cx, 68);

    const done = state.storyDone ? 5 : state.missionState === 'done' ? state.missionIndex + 1 : state.missionIndex;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(10, 104, 190, 74);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(10, 104, 190, 74);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillText(`MISSIONS ${done}/5`, 20, 124);
    let progress = `PACKAGES ${state.missionIndex === 3 ? state.missionStage : 0}/3`;
    if (state.missionIndex === 0) progress = `DROP-OFF ${state.missionStage}/2`;
    else if (state.missionIndex === 1) progress = state.missionStage > 0 ? 'FALCO: RESPRAY' : 'FALCO: STEAL';
    else if (state.missionIndex === 2) progress = `HEAT ${state.wanted}★`;
    else if (state.missionIndex === 4) progress = state.passenger ? 'ILSA ABOARD' : 'DELIVERED';
    ctx.fillText(progress, 20, 144);
    ctx.fillText(`CARS STOLEN ${state.carsStolen || 0}`, 20, 164);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.panel;
    const obj = state.missionState === 'active' && state.mission ? state.mission.objective : 'Free roam — explore Solmar Bay';
    ctx.font = `bold 15px ${FONT}`;
    const ow = ctx.measureText(obj).width + 24;
    ctx.fillRect(vw / 2 - ow / 2, canvas.height - 64, ow, 26);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(obj, vw / 2, canvas.height - 46);
    if (state.missionState === 'active' && state.missionTimer > 0) {
      ctx.fillStyle = state.missionTimer < 30 ? '#ff8a80' : PALETTE.gold;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText(`⏱ ${Math.ceil(state.missionTimer)}s`, vw / 2, canvas.height - 76);
    }
    if (!p.onFoot) {
      const car = world.state.cars.find((c) => c.id === p.carId);
      if (car) {
        ctx.textAlign = 'left';
        ctx.fillStyle = PALETTE.panel;
        ctx.fillRect(10, canvas.height - 64, 210, 26);
        ctx.fillStyle = PALETTE.text;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(`${car.spec.name}  ${Math.round(Math.abs(car.speed) * 0.06)} mph`, 20, canvas.height - 46);
        ctx.fillStyle = '#ff8a80';
        ctx.fillRect(10, canvas.height - 34, 210 * Math.max(0, car.health / car.spec.health), 6);
      }
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(24,20,16,0.75)';
    ctx.fillRect(0, canvas.height - 26, vw, 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('WASD / Arrows move · Enter enter car · Space punch / handbrake · Shift sprint · P pause · M mute · R retry mission', vw / 2, canvas.height - 9);

    if (state.banner) {
      ctx.globalAlpha = Math.min(1, state.banner.life);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 44px ${FONT}`;
      ctx.fillText(state.banner.text, vw / 2, canvas.height / 2 - 60);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText(state.banner.sub, vw / 2, canvas.height / 2 - 28);
      ctx.globalAlpha = 1;
    }
    if (state.wanted > 0) {
      ctx.fillStyle = `rgba(229,83,75,${0.10 + 0.05 * state.wanted})`;
      ctx.fillRect(0, 0, vw, canvas.height);
    }
  }

  function panel(title, lines, footnote) {
    const vw = canvas.width;
    const vh = canvas.height;
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = PALETTE.panel;
    const w = 640;
    const h = 120 + lines.length * 26 + (footnote ? 30 : 0);
    ctx.fillRect(vw / 2 - w / 2, vh / 2 - h / 2, w, h);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(vw / 2 - w / 2, vh / 2 - h / 2, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText(title, vw / 2, vh / 2 - h / 2 + 48);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, vw / 2, vh / 2 - h / 2 + 88 + i * 26);
    });
    if (footnote) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `14px ${FONT}`;
      ctx.fillText(footnote, vw / 2, vh / 2 + h / 2 - 18);
    }
  }

  function drawTitle(world, best, hasSave) {
    const vw = canvas.width;
    const vh = canvas.height;
    ctx.fillStyle = '#2a1f14';
    ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#1d7f8f';
    ctx.fillRect(0, vh - 120, vw, 120);
    ctx.fillStyle = '#e8d39a';
    ctx.fillRect(0, vh - 140, vw, 20);
    ctx.fillStyle = '#4a4640';
    ctx.fillRect(0, vh - 200, vw, 60);
    ctx.fillStyle = '#d8cfae';
    for (let x = 0; x < vw; x += 48) ctx.fillRect(x, vh - 172, 24, 4);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 72px ${FONT}`;
    ctx.fillText('SOLMAR BAY', vw / 2, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(STORY.features, vw / 2, 190);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('Dana Reyes owes the Harbor Crew. Five jobs. One way out.', vw / 2, 222);
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(vw / 2 - 260, 260, 520, 150);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(vw / 2 - 260, 260, 520, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${FONT}`;
    const opts = hasSave ? ['CONTINUE  —  press Enter', 'NEW GAME  —  press N'] : ['NEW GAME  —  press Enter'];
    opts.forEach((o, i) => ctx.fillText(o, vw / 2, 300 + i * 34));
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('WASD / Arrows move · Enter enter car · Space punch / handbrake · Shift sprint', vw / 2, 386);
    ctx.fillText('P pause · M mute · R retry mission · Mouse clicks menus', vw / 2, 410);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText(`BEST SCORE $${best}`, vw / 2, 452);
  }

  function draw(world, screen, best, extra) {
    resize();
    const vw = canvas.width;
    const vh = canvas.height;
    if (screen === SCREEN_TITLE) {
      drawTitle(world, best, extra && extra.hasSave);
      return;
    }
    const cam = drawWorld(world);
    drawHud(world, best);
    drawMinimap(world, cam);
    if (screen === SCREEN_CARD && extra && extra.mission) {
      const m = extra.mission;
      panel(`JOB ${m.id}: ${m.name}`, [m.brief, `Reward: $${m.reward}`], 'Press Enter to take the job');
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['WASD / Arrows move · Enter enter car · Space punch / handbrake', 'Shift sprint · M mute · R restart mission'], 'Press P or Enter to keep playing');
    } else if (screen === SCREEN_BUSTED) {
      panel('BUSTED', ['The police caught up with you.', 'Lost 10% of your cash.'], 'Press Enter to walk out of the station');
    } else if (screen === SCREEN_WASTED) {
      panel('WASTED', ['Dana is down. The hospital patches you up.', 'Lost 10% of your cash.'], 'Press Enter to walk out of the hospital');
    } else if (screen === SCREEN_FAILED) {
      panel('JOB FAILED', [extra && extra.reason ? extra.reason : 'The job fell apart.'], 'Press R or Enter to retry the mission');
    } else if (screen === SCREEN_COMPLETE) {
      panel('STORY COMPLETE', [`All five jobs done. The debt is paid.`, `Total earned: $${world.state.score}   Best: $${best}`], 'Free roam continues — press Enter');
    } else if (screen === SCREEN_OVER) {
      panel('GAME OVER', [`Score $${world.state.score}`], 'Press Enter to play again');
    }
  }

  return { draw, resize };
}
