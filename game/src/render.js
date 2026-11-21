// Drawing: the world, the heads-up display, the minimap and every screen.
// One function draws one frame from the world state; nothing here changes
// the state.

import { CONFIG } from './config.js';
import { districtAt, isOnRoad, buildingAt } from './city.js';
import { currentObjective, winLoseLines } from './world.js';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function drawCarShape(ctx, x, y, angle, length, width, color, opts) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-length / 2 + 4, -width / 2 + 4, length, width);
  ctx.fillStyle = color;
  roundRect(ctx, -length / 2, -width / 2, length, width, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  ctx.fillRect(-length * 0.18, -width * 0.38, length * 0.28, width * 0.76);
  ctx.fillStyle = '#f5e9c9';
  ctx.fillRect(length / 2 - 3, -width / 2 + 3, 3, 5);
  ctx.fillRect(length / 2 - 3, width / 2 - 8, 3, 5);
  if (opts && opts.smoke) {
    ctx.fillStyle = 'rgba(120,120,120,0.7)';
    ctx.beginPath();
    ctx.arc(-length / 2 - 4, 0, 6 + Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (opts && opts.fire) {
    ctx.fillStyle = '#e86a2a';
    ctx.beginPath();
    ctx.arc(-length / 2, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWorld(ctx, w, view) {
  const { camX, camY, scale } = view;
  ctx.save();
  ctx.translate(-camX * scale, -camY * scale);
  ctx.scale(scale, scale);
  const pal = CONFIG.palette;
  ctx.fillStyle = pal.sand;
  ctx.fillRect(0, 0, CONFIG.worldWidth, CONFIG.worldHeight);
  ctx.fillStyle = pal.beach;
  ctx.fillRect(0, CONFIG.beachTop, CONFIG.worldWidth, CONFIG.seaTop - CONFIG.beachTop);
  ctx.fillStyle = pal.sea;
  ctx.fillRect(0, CONFIG.seaTop, CONFIG.worldWidth, CONFIG.worldHeight - CONFIG.seaTop);
  ctx.fillStyle = pal.seaDeep;
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(i * 340 + 60, CONFIG.seaTop + 40 + (i % 3) * 30, 120, 6);
  }
  for (const p of w.city.parks) {
    ctx.fillStyle = pal.grass;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = pal.parkPath;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h / 2);
    ctx.lineTo(p.x + p.w, p.y + p.h / 2);
    ctx.moveTo(p.x + p.w / 2, p.y);
    ctx.lineTo(p.x + p.w / 2, p.y + p.h);
    ctx.stroke();
  }
  for (const t of w.city.trees) {
    ctx.fillStyle = '#4a7a3a';
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d8f47';
    ctx.beginPath();
    ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.road;
  for (const cx of w.city.roadsX) ctx.fillRect(cx - CONFIG.roadWidth / 2, 0, CONFIG.roadWidth, CONFIG.beachTop);
  for (const cy of w.city.roadsY) {
    if (cy < CONFIG.beachTop) ctx.fillRect(0, cy - CONFIG.roadWidth / 2, CONFIG.worldWidth, CONFIG.roadWidth);
  }
  ctx.strokeStyle = pal.sidewalk;
  ctx.lineWidth = CONFIG.sidewalk;
  for (const cx of w.city.roadsX) {
    ctx.beginPath(); ctx.moveTo(cx - CONFIG.roadWidth / 2 - CONFIG.sidewalk / 2, 0); ctx.lineTo(cx - CONFIG.roadWidth / 2 - CONFIG.sidewalk / 2, CONFIG.beachTop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + CONFIG.roadWidth / 2 + CONFIG.sidewalk / 2, 0); ctx.lineTo(cx + CONFIG.roadWidth / 2 + CONFIG.sidewalk / 2, CONFIG.beachTop); ctx.stroke();
  }
  ctx.fillStyle = pal.plaza;
  ctx.fillRect(w.city.plaza.x, w.city.plaza.y, w.city.plaza.w, w.city.plaza.h);
  ctx.strokeStyle = pal.roadLine;
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  for (const cx of w.city.roadsX) {
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, CONFIG.beachTop); ctx.stroke();
  }
  for (const cy of w.city.roadsY) {
    if (cy < CONFIG.beachTop) { ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(CONFIG.worldWidth, cy); ctx.stroke(); }
  }
  ctx.setLineDash([]);
  ctx.fillStyle = pal.pier;
  ctx.fillRect(w.city.pier.x, w.city.pier.y, w.city.pier.w, w.city.pier.h);
  ctx.fillStyle = '#7a5a34';
  for (let y = w.city.pier.y; y < w.city.pier.y + w.city.pier.h; y += 24) {
    ctx.fillRect(w.city.pier.x, y, w.city.pier.w, 3);
  }
  ctx.fillStyle = '#f5f0e0';
  ctx.beginPath();
  ctx.ellipse(CONFIG.landmarks.boat.x, CONFIG.landmarks.boat.y, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9c9c9';
  ctx.fillRect(CONFIG.landmarks.boat.x - 3, CONFIG.landmarks.boat.y - 26, 6, 26);
  for (const b of w.city.buildings) {
    ctx.fillStyle = pal.buildingShadow;
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
    if (b.tall) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.2, b.w * 0.25, b.h * 0.6);
      ctx.fillRect(b.x + b.w * 0.6, b.y + b.h * 0.15, b.w * 0.2, b.h * 0.5);
    }
    if (b.name === 'safehouse') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAFEHOUSE', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
    if (b.name === 'paintshop') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAINT SHOP', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
    if (b.name === 'police') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
    if (b.name === 'hospital') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HOSPITAL', b.x + b.w / 2, b.y + b.h / 2 + 4);
    }
  }
  ctx.fillStyle = pal.crane;
  ctx.fillRect(2200, 1240, 10, 90);
  ctx.fillRect(2200, 1240, 70, 10);
  ctx.fillRect(2320, 1180, 10, 150);
  ctx.fillRect(2320, 1180, 60, 10);
  if (w.mission && w.mission.target) {
    const t = w.mission.target;
    const pulse = 1 + Math.sin(w.time * 5) * 0.15;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(13, 0); ctx.lineTo(0, 18); ctx.lineTo(-13, 0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6d00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  if (w.mission && w.mission.index === 3) {
    for (const pkg of w.mission.packages) {
      if (pkg.got) continue;
      ctx.fillStyle = '#ffe14d';
      ctx.fillRect(pkg.x - 10, pkg.y - 8, 20, 16);
      ctx.strokeStyle = '#8a6d00';
      ctx.lineWidth = 2;
      ctx.strokeRect(pkg.x - 10, pkg.y - 8, 20, 16);
    }
  }
  for (const pk of w.pickups) {
    const bob = Math.sin(pk.bob) * 3;
    ctx.fillStyle = '#37c978';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', pk.x, pk.y + bob + 4);
  }
  ctx.strokeStyle = 'rgba(30,30,30,0.55)';
  ctx.lineWidth = 3;
  for (const s of w.skids) {
    ctx.globalAlpha = clamp(s.life / 4, 0, 0.8);
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const c of w.cars) {
    const t = CONFIG.vehicles[c.type];
    drawCarShape(ctx, c.x, c.y, c.angle, t.length, t.width, c.color, { smoke: c.smoke, fire: c.health <= 0 });
    if (c.police) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(c.x - 14, c.y - 4, 28, 8);
      ctx.fillStyle = '#2a4a8a';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', c.x, c.y + 3);
    }
    if (c.parked && !c.police) {
      ctx.fillStyle = 'rgba(255,225,77,0.9)';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('E', c.x, c.y - 18);
    }
  }
  for (const ped of w.peds) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(ped.x + 3, ped.y + 4, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (ped.state === 'down') {
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8c9a0';
      ctx.beginPath();
      ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const o of w.officers) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(o.x + 3, o.y + 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a4a8a';
    ctx.beginPath();
    ctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(o.x, o.y - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const p = w.player;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 5, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.onFoot) {
    ctx.fillStyle = '#e83a3a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 5, 0, Math.PI * 2);
    ctx.fill();
    if (p.punchAnim > 0) {
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const pop of w.popups) {
    ctx.globalAlpha = clamp(pop.life, 0, 1);
    ctx.fillStyle = '#7dff9a';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawMinimap(ctx, w, x, y, size) {
  const s = size / CONFIG.worldWidth;
  ctx.save();
  ctx.fillStyle = CONFIG.palette.minimapBg;
  ctx.fillRect(x, y, size, size * (CONFIG.worldHeight / CONFIG.worldWidth));
  const h = size * (CONFIG.worldHeight / CONFIG.worldWidth);
  ctx.strokeStyle = '#c9b98a';
  ctx.lineWidth = 1;
  for (const cx of w.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x + cx * s, y);
    ctx.lineTo(x + cx * s, y + h);
    ctx.stroke();
  }
  for (const cy of w.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x, y + cy * s);
    ctx.lineTo(x + size, y + cy * s);
    ctx.stroke();
  }
  ctx.fillStyle = '#2e7f8f';
  ctx.fillRect(x, y + CONFIG.seaTop * s, size, h - CONFIG.seaTop * s);
  ctx.fillStyle = '#8a7fb8';
  for (const b of w.city.buildings) ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(1, b.w * s), Math.max(1, b.h * s));
  ctx.fillStyle = '#37c978';
  const L = CONFIG.landmarks;
  ctx.fillRect(x + (L.safehouse.x + L.safehouse.w / 2) * s - 2, y + (L.safehouse.y + L.safehouse.h / 2) * s - 2, 4, 4);
  ctx.fillStyle = '#d9a03a';
  ctx.fillRect(x + (L.paintShop.x + L.paintShop.w / 2) * s - 2, y + (L.paintShop.y + L.paintShop.h / 2) * s - 2, 4, 4);
  if (w.mission && w.mission.target) {
    const t = w.mission.target;
    const pulse = 1 + Math.sin(w.time * 5) * 0.3;
    ctx.fillStyle = '#ffe14d';
    ctx.beginPath();
    ctx.arc(x + t.x * s, y + t.y * s, 4 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#9a9a9a';
  for (const c of w.traffic) ctx.fillRect(x + c.x * s - 1, y + c.y * s - 1, 2, 2);
  ctx.fillStyle = '#ff4a4a';
  for (const c of w.policeCars) ctx.fillRect(x + c.x * s - 2, y + c.y * s - 2, 4, 4);
  const p = w.player;
  ctx.save();
  ctx.translate(x + p.x * s, y + p.y * s);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawHud(ctx, w, width, height) {
  const p = w.player;
  const lines = winLoseLines(w);
  ctx.fillStyle = 'rgba(10,16,24,0.55)';
  ctx.fillRect(12, 12, 300, 86);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CASH $' + Math.floor(w.cash), 22, 34);
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('SCORE $' + Math.floor(w.earned), 22, 60);
  ctx.fillStyle = '#c9c9c9';
  ctx.font = '13px sans-serif';
  ctx.fillText('BEST $' + Math.floor(w.best), 22, 80);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(22, 88, 120, 8);
  ctx.fillStyle = p.health > 40 ? '#37c978' : '#e83a3a';
  ctx.fillRect(22, 88, 120 * clamp(p.health / 100, 0, 1), 8);
  ctx.fillStyle = '#fff';
  ctx.font = '12px sans-serif';
  ctx.fillText('HP ' + Math.max(0, Math.ceil(p.health)), 148, 96);
  ctx.textAlign = 'center';
  ctx.font = '26px sans-serif';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < w.wanted ? '★' : '☆';
  ctx.fillStyle = w.wanted > 0 ? '#ffd94d' : '#888';
  ctx.fillText(stars, width / 2, 38);
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#7dff9a';
  ctx.fillText(lines.win, width / 2, 58);
  ctx.fillStyle = '#ff8a8a';
  ctx.fillText(lines.lose, width / 2, 76);
  drawMinimap(ctx, w, width - 180, 12, 168);
  ctx.fillStyle = 'rgba(10,16,24,0.55)';
  ctx.fillRect(12, 110, 210, 74);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PROGRESS  ' + districtAt(p.x, p.y), 22, 130);
  ctx.font = '13px sans-serif';
  ctx.fillText('Missions  ' + w.missionsDone.length + ' / 5', 22, 150);
  ctx.fillText('Packages  ' + w.packagesCollected, 22, 168);
  ctx.fillText('Cars stolen  ' + w.carsStolen, 22, 186);
  if (w.mission && w.mission.timer > 0) {
    ctx.fillStyle = w.mission.timer < 30 ? '#ff8a8a' : '#ffe14d';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(w.mission.timer) + 's', width / 2, height - 64);
  }
  ctx.fillStyle = 'rgba(10,16,24,0.55)';
  ctx.fillRect(width / 2 - 260, height - 52, 520, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(currentObjective(w), width / 2, height - 36);
  if (!p.onFoot) {
    const car = w.cars.find((c) => c.id === p.carId);
    if (car) {
      ctx.fillStyle = 'rgba(10,16,24,0.55)';
      ctx.fillRect(12, height - 86, 190, 34);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(CONFIG.vehicles[car.type].name, 22, height - 64);
      ctx.fillStyle = '#c9c9c9';
      ctx.font = '13px sans-serif';
      ctx.fillText(Math.round(Math.abs(car.speed) * 0.36) + ' km/h', 110, height - 64);
    }
  }
  ctx.fillStyle = 'rgba(10,16,24,0.7)';
  ctx.fillRect(0, height - 26, width, 26);
  ctx.fillStyle = '#d9d9d9';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(CONFIG.controls.map((c) => c[0] + ' ' + c[1]).join('   •   '), width / 2, height - 8);
  if (w.messageTimer > 0) {
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(w.message, width / 2, 110);
  }
  if (w.player.health < 40 && w.player.health > 0) {
    const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.7);
    g.addColorStop(0, 'rgba(200,0,0,0)');
    g.addColorStop(1, 'rgba(200,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawPanel(ctx, width, height, title) {
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#f5e9c9';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, height * 0.28);
}

function drawButton(ctx, x, y, bw, bh, label, hot) {
  ctx.fillStyle = hot ? '#ffe14d' : '#2a4a8a';
  roundRect(ctx, x, y, bw, bh, 8);
  ctx.fill();
  ctx.fillStyle = hot ? '#1a1a1a' : '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + bw / 2, y + bh / 2 + 6);
}

export function buttonHit(mx, my, x, y, bw, bh) {
  return mx >= x && mx <= x + bw && my >= y && my <= y + bh;
}

export function render(ctx, w, width, height, view) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(0, 0, width, height);
  if (w.screen === 'title') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'SOLMAR BAY');
    ctx.fillStyle = '#ffe14d';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(CONFIG.titleFeatures, width / 2, height * 0.28 + 34);
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.fillText('Dana Reyes owes the Harbor Crew. Five jobs. One way out.', width / 2, height * 0.28 + 62);
    ctx.fillText('BEST $' + Math.floor(w.best), width / 2, height * 0.28 + 88);
    drawButton(ctx, width / 2 - 110, height * 0.28 + 120, 220, 44, w.missionsDone.length > 0 || w.cash > 0 ? 'CONTINUE' : 'NEW GAME', true);
    ctx.fillStyle = '#d9d9d9';
    ctx.font = '13px sans-serif';
    ctx.fillText(CONFIG.controls.map((c) => c[0] + ' ' + c[1]).join('   •   '), width / 2, height - 40);
    return;
  }
  if (w.screen === 'phone') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'INCOMING CALL — SAL MARIN');
    const m = w.mission;
    if (m) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('MISSION ' + m.def.id + ': ' + m.def.name.toUpperCase(), width / 2, height * 0.36);
      ctx.font = '15px sans-serif';
      wrapText(ctx, m.def.brief, width / 2, height * 0.42, width * 0.6, 22);
      ctx.fillStyle = '#7dff9a';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('REWARD $' + m.def.reward, width / 2, height * 0.42 + 96);
      drawButton(ctx, width / 2 - 110, height * 0.42 + 120, 220, 44, 'ACCEPT — E', true);
    }
    return;
  }
  if (w.screen === 'pause') {
    drawWorld(ctx, w, view);
    drawHud(ctx, w, width, height);
    drawPanel(ctx, width, height, 'PAUSED');
    ctx.fillStyle = '#fff';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Missions done: ' + w.missionsDone.length + ' / 5    Cash $' + Math.floor(w.cash), width / 2, height * 0.36);
    ctx.fillText('Click a finished mission to replay it, or press P to resume.', width / 2, height * 0.36 + 26);
    drawButton(ctx, width / 2 - 110, height * 0.36 + 60, 220, 44, 'RESUME — P', true);
    drawButton(ctx, width / 2 - 110, height * 0.36 + 116, 220, 44, 'RESTART MISSION — R', false);
    return;
  }
  if (w.screen === 'complete') {
    drawWorld(ctx, w, view);
    drawHud(ctx, w, width, height);
    ctx.fillStyle = 'rgba(8,12,20,0.6)';
    ctx.fillRect(0, height * 0.3, width, 120);
    ctx.fillStyle = '#7dff9a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MISSION COMPLETE', width / 2, height * 0.3 + 48);
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.fillText('Score $' + Math.floor(w.earned) + '   •   Best $' + Math.floor(w.best), width / 2, height * 0.3 + 84);
    drawButton(ctx, width / 2 - 110, height * 0.3 + 100, 220, 44, 'CONTINUE — E', true);
    return;
  }
  if (w.screen === 'failed') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'MISSION FAILED');
    ctx.fillStyle = '#ff8a8a';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.failReason || 'Mission failed', width / 2, height * 0.36);
    drawButton(ctx, width / 2 - 110, height * 0.42, 220, 44, 'RETRY — E', true);
    return;
  }
  if (w.screen === 'busted') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'BUSTED');
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('The police caught you. You lost 10% of your cash.', width / 2, height * 0.36);
    drawButton(ctx, width / 2 - 110, height * 0.42, 220, 44, 'CONTINUE — E', true);
    return;
  }
  if (w.screen === 'wasted') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'WASTED');
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You were taken down. You lost 10% of your cash.', width / 2, height * 0.36);
    drawButton(ctx, width / 2 - 110, height * 0.42, 220, 44, 'CONTINUE — E', true);
    return;
  }
  if (w.screen === 'story') {
    drawWorld(ctx, w, view);
    drawPanel(ctx, width, height, 'STORY COMPLETE');
    ctx.fillStyle = '#7dff9a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('The debt is paid. Solmar Bay is yours.', width / 2, height * 0.36);
    ctx.fillStyle = '#fff';
    ctx.font = '17px sans-serif';
    ctx.fillText('Total earned $' + Math.floor(w.earned) + '   •   Cars stolen ' + w.carsStolen + '   •   Missions 5 / 5', width / 2, height * 0.36 + 32);
    ctx.fillText('Free roam continues — press E to keep playing.', width / 2, height * 0.36 + 62);
    drawButton(ctx, width / 2 - 110, height * 0.44, 220, 44, 'FREE ROAM — E', true);
    return;
  }
  drawWorld(ctx, w, view);
  drawHud(ctx, w, width, height);
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

export function cameraFor(w, width, height) {
  const scale = clamp(Math.min(width / 1100, height / 800), 0.5, 1.1);
  const vw = width / scale, vh = height / scale;
  let camX = w.player.x - vw / 2;
  let camY = w.player.y - vh / 2;
  camX = clamp(camX, 0, Math.max(0, CONFIG.worldWidth - vw));
  camY = clamp(camY, 0, Math.max(0, CONFIG.worldHeight - vh));
  if (w.shake > 0) {
    camX += (Math.random() - 0.5) * w.shake;
    camY += (Math.random() - 0.5) * w.shake;
  }
  return { camX, camY, scale };
}
