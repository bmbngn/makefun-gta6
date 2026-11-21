// Every tuning number, colour, name and story beat of Solmar Bay in one
// place. Nothing here is read from the network; the whole game is static.

export const STEP = 1 / 60;
export const WORLD = { width: 2560, height: 1920 };
export const ROAD_GAP = 320;
export const ROAD_HALF = 32;
export const WALK_HALF = 56;
export const SEA_TOP = 1840;
export const SAND_TOP = 1760;

export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best';

export const PLAYER = {
  radius: 10,
  walkSpeed: 170,
  runSpeed: 265,
  health: 100,
  punchRange: 34,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const VEHICLES = {
  suncab: { name: 'SunCab', top: 430, accel: 300, brake: 520, turn: 2.6, grip: 7.5, health: 100, color: '#f2b705', roof: '#ffe066', width: 34, length: 58 },
  comet: { name: 'Comet', top: 470, accel: 320, brake: 540, turn: 2.8, grip: 7.5, health: 100, color: '#5b8dd9', roof: '#9cc3f0', width: 32, length: 56 },
  falco: { name: 'Falco GT', top: 560, accel: 380, brake: 600, turn: 3.3, grip: 8.5, health: 90, color: '#d94040', roof: '#ff7a6b', width: 32, length: 58 },
  mule: { name: 'Mule', top: 360, accel: 240, brake: 460, turn: 2.2, grip: 7.0, health: 160, color: '#7a8a99', roof: '#aeb9c4', width: 38, length: 66 },
  police: { name: 'Patrol', top: 520, accel: 360, brake: 620, turn: 3.1, grip: 8.0, health: 120, color: '#20242e', roof: '#e8ecf2', width: 34, length: 58 },
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 24;
export const PICKUP_COUNT = 10;

export const WANTED_DECAY = [0, 12, 18, 25, 35, 45];
export const POLICE_CARS = [0, 1, 2, 3, 4, 5];
export const POLICE_SPEED = [0, 430, 460, 490, 520, 550];

export const MISSIONS = [
  {
    id: 1, name: 'The Pickup', reward: 150,
    brief: 'Sal Marin: Dana, the Harbor Crew needs a package run. Walk to the SunCab outside the safehouse, then drive it to the Docks marker. Easy money. Do not scratch the paint.',
    objective: 'Drive the SunCab to the Docks marker',
    win: 'Deliver the package to the Docks',
    lose: 'Busted or wasted',
  },
  {
    id: 2, name: 'Borrowed Wheels', reward: 250,
    brief: 'Sal Marin: The crew needs a fast car and the Marina lot has a Falco GT sitting pretty. Take it. Then get a respray at the paint shop in the Docks before the heat sticks.',
    objective: 'Steal the Falco GT, then respray at the paint shop',
    win: 'Respray the Falco GT at the paint shop',
    lose: 'Busted or wasted',
  },
  {
    id: 3, name: 'Heat', reward: 300,
    brief: 'Sal Marin: Vince Torro tipped the police. You are at three stars before you even start the engine. Lose them — stay out of sight — then get to the safehouse in Old Town.',
    objective: 'Lose 3 stars, then reach the safehouse',
    win: 'Reach the safehouse with 0 stars',
    lose: 'Busted or wasted',
  },
  {
    id: 4, name: 'The Getaway', reward: 500,
    brief: 'Sal Marin: Three packages, three corners of the city, one hundred and fifty seconds. Downtown, Old Town, the Docks — then the Pier. Patrols are out the whole time. Go.',
    objective: 'Collect 3 packages, then deliver to the Pier',
    win: 'Deliver all 3 packages to the Pier in time',
    lose: 'Timer runs out, busted or wasted',
    timer: 150,
  },
  {
    id: 5, name: 'Solmar Nights', reward: 800,
    brief: 'Ilsa Kade: Tonight I ride with you, Dana. Drive me to the Marina boat. Four stars the whole way and Vince\'s friends everywhere. Do not stop. Do not look back.',
    objective: 'Drive Ilsa Kade to the Marina boat',
    win: 'Reach the Marina boat with Ilsa aboard',
    lose: 'Busted or wasted',
  },
];

export const STORY = {
  hero: 'Dana Reyes',
  fixer: 'Sal Marin',
  boss: 'Ilsa Kade',
  rival: 'Vince Torro',
  crew: 'Harbor Crew',
  title: 'Solmar Bay',
  features: '5 districts, 5 story missions, 4 stealable cars, 5-star wanted, traffic, police chases, minimap',
};

export const PALETTE = {
  sea: '#1d7f8f',
  seaDeep: '#14606e',
  sand: '#e8d39a',
  road: '#4a4640',
  roadLine: '#d8cfae',
  sidewalk: '#8a8378',
  park: '#5d8a4a',
  parkPath: '#c9b489',
  plaza: '#b9a98a',
  buildingRoof: ['#c96f4a', '#d9a05b', '#7fa3b8', '#b87a9e', '#8fae7a', '#c9b458'],
  buildingRoofDark: '#8a5a44',
  shadow: 'rgba(40, 26, 12, 0.28)',
  text: '#fff6e0',
  muted: '#d9cba8',
  panel: 'rgba(24, 20, 16, 0.82)',
  panelEdge: '#6b5a3e',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#7ed491',
  policeRed: '#ff5a4e',
  policeBlue: '#4f8ef7',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
