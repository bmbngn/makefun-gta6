// Every tuning number, colour, district, vehicle and mission script for
// Solmar Bay. Nothing else in the game hard-codes a number that lives here.

export const CONFIG = {
  worldWidth: 2560,
  worldHeight: 1920,
  roadEvery: 320,
  roadWidth: 64,
  sidewalk: 16,
  seaTop: 1760,
  beachTop: 1600,
  step: 1 / 60,
  saveKey: 'solmar-bay.save.v1',

  palette: {
    sand: '#d9b380',
    road: '#8a7a68',
    roadLine: '#e8d9a0',
    sidewalk: '#b9a98e',
    grass: '#7fae62',
    parkPath: '#cbb98a',
    sea: '#2e7f8f',
    seaDeep: '#256b7d',
    beach: '#e3c893',
    buildingShadow: 'rgba(60,30,10,0.25)',
    roofs: ['#c96f5a', '#d9a05a', '#7fae8a', '#8a7fb8', '#b8b0a0', '#e07f7f', '#6fa8c9'],
    plaza: '#cbb98a',
    pier: '#9a7a52',
    crane: '#d9a03a',
    minimapBg: 'rgba(20,30,40,0.85)',
  },

  districts: [
    { name: 'Downtown', x: 960, y: 0, w: 640, h: 640, tall: true },
    { name: 'Old Town', x: 0, y: 0, w: 960, h: 960, tall: false },
    { name: 'Hills', x: 1600, y: 0, w: 960, h: 960, tall: false },
    { name: 'Docks', x: 1600, y: 960, w: 960, h: 640, tall: false },
    { name: 'Marina', x: 0, y: 1600, w: 2560, h: 320, tall: false },
  ],

  landmarks: {
    plaza: { x: 1184, y: 224, w: 192, h: 192 },
    safehouse: { x: 288, y: 608, w: 128, h: 96 },
    paintShop: { x: 1888, y: 1248, w: 160, h: 96 },
    policeStation: { x: 928, y: 128, w: 128, h: 96 },
    hospital: { x: 288, y: 288, w: 128, h: 96 },
    pier: { x: 2000, y: 1600, w: 96, h: 272 },
    marinaLot: { x: 1856, y: 1408, w: 256, h: 128 },
    docksMarker: { x: 2112, y: 1312 },
    pierMarker: { x: 2048, y: 1824 },
    boat: { x: 2048, y: 1888 },
  },

  vehicles: {
    suncab: {
      name: 'SunCab', topSpeed: 380, accel: 260, brake: 420, reverse: 140,
      steer: 2.6, grip: 8, health: 100, length: 46, width: 22,
      colors: ['#e8b73a', '#d9a03a'], common: true,
    },
    comet: {
      name: 'Comet', topSpeed: 400, accel: 280, brake: 440, reverse: 150,
      steer: 2.7, grip: 8, health: 100, length: 46, width: 22,
      colors: ['#7fa8c9', '#c96f5a', '#8ab87f', '#b8b0a0'], common: true,
    },
    falco: {
      name: 'Falco GT', topSpeed: 520, accel: 380, brake: 520, reverse: 160,
      steer: 3.1, grip: 9, health: 80, length: 48, width: 21,
      colors: ['#c93a3a', '#2a2a2a'], common: false,
    },
    mule: {
      name: 'Mule', topSpeed: 300, accel: 200, brake: 380, reverse: 120,
      steer: 2.2, grip: 7, health: 180, length: 58, width: 24,
      colors: ['#6f7a6f', '#8a7a52'], common: false,
    },
    police: {
      name: 'Patrol', topSpeed: 470, accel: 340, brake: 500, reverse: 150,
      steer: 3.0, grip: 9, health: 120, length: 48, width: 22,
      colors: ['#2a4a8a'], common: false,
    },
  },

  onFoot: { walk: 150, run: 240, punchRange: 42, punchDamage: 34, punchCooldown: 0.45 },
  trafficCount: 14,
  pedCount: 24,
  trafficSpeed: { min: 140, max: 220 },
  pedSpeed: { min: 40, max: 70 },
  pedFleeSpeed: 140,
  trafficDespawn: 900,
  carAheadSlow: 60,

  wantedDecaySeconds: [0, 12, 18, 25, 35, 45],
  wantedMax: 5,
  policeRamDamage: 0.05,
  policeRamSpeed: 150,
  officerBustSeconds: 1.5,
  officerSpeed: 165,
  stealSightRange: 220,
  resprayCost: 100,
  bustedLoss: 0.10,

  missions: [
    {
      id: 1, name: 'The Pickup', reward: 150,
      brief: 'Sal Marin: Dana, the crew needs a package run. Walk to the SunCab outside the safehouse, drive it to the Docks marker and drop the package. No heat on this one — keep it clean.',
      objective: 'Get in the SunCab, then drive to the Docks marker',
      win: 'Package delivered at the Docks',
      lose: 'Busted or wasted',
    },
    {
      id: 2, name: 'Borrowed Wheels', reward: 250,
      brief: 'Sal Marin: Ilsa wants the Falco GT from the Marina lot. Take it — the theft will bring one star — then get to the paint shop in the Docks for a respray. Respray clears the heat and fixes the car.',
      objective: 'Steal the Falco GT, then reach the paint shop',
      win: 'Falco resprayed at the paint shop',
      lose: 'Busted or wasted',
    },
    {
      id: 3, name: 'Heat', reward: 300,
      brief: 'Sal Marin: Vince Torro tipped off the police — you start this one at three stars. Stay out of sight until the heat dies down, then slip back to the safehouse. The safehouse halves the wait.',
      objective: 'Lose all 3 stars, then reach the safehouse',
      win: 'Heat gone, safe at the safehouse',
      lose: 'Busted or wasted',
    },
    {
      id: 4, name: 'The Getaway', reward: 500,
      brief: 'Sal Marin: Three packages, three corners of the city, one hundred and fifty seconds. Downtown, Old Town, the Docks — then deliver them all to the Pier. Patrols are out the whole time.',
      objective: 'Collect 3 packages, deliver to the Pier',
      win: 'All packages delivered to the Pier',
      lose: 'Time runs out, busted or wasted',
      timer: 150,
    },
    {
      id: 5, name: 'Solmar Nights', reward: 800,
      brief: 'Ilsa Kade: Dana, ride with me. Four stars on us the whole way — drive me to the Marina boat and do not stop for anything. Finish this and the debt is done.',
      objective: 'Drive Ilsa to the Marina boat',
      win: 'Ilsa aboard at the Marina boat',
      lose: 'Busted or wasted',
    },
  ],

  story: {
    hero: 'Dana Reyes',
    fixer: 'Sal Marin',
    boss: 'Ilsa Kade',
    rival: 'Vince Torro',
    crew: 'Harbor Crew',
  },

  controls: [
    ['Move', 'WASD / Arrows'],
    ['Enter car', 'E'],
    ['Punch', 'F'],
    ['Sprint', 'Shift'],
    ['Handbrake', 'Space'],
    ['Pause', 'P / Esc'],
    ['Mute', 'M'],
    ['Restart mission', 'R'],
  ],

  titleFeatures: '5 districts, 5 story missions, 4 stealable cars, 5-star wanted, traffic, police chases, minimap',
};
