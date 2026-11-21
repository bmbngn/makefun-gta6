// Seeded random numbers. Every bit of randomness in the game comes from
// here, so a fixed seed replays the same city, traffic and missions.

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    float(min, max) {
      return min + rng.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(rng.float(min, max + 1));
    },
    pick(list) {
      return list[Math.floor(rng.next() * list.length)];
    },
    chance(p) {
      return rng.next() < p;
    },
    sign() {
      return rng.next() < 0.5 ? -1 : 1;
    },
  };
  return rng;
}
