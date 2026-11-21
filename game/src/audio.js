// Synthesised WebAudio only: no audio files. Engine hum, sirens, impacts,
// chimes and a quiet bass-and-hats loop, all built from oscillators.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null, engineGain = null, engineFilter = null;
  let sirenOsc = null, sirenGain = null, sirenTimer = 0, sirenHigh = false;
  let driftNoise = null, driftGain = null;
  let musicTimer = null, musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lowFreq || 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 300;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
  }

  function startDrift() {
    if (!ensure() || driftNoise) return;
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    driftNoise = ctx.createBufferSource();
    driftNoise.buffer = buf; driftNoise.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    driftGain = ctx.createGain(); driftGain.gain.value = 0;
    driftNoise.connect(f); f.connect(driftGain); driftGain.connect(master);
    driftNoise.start();
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'square';
    sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.05;
    sirenOsc.connect(sirenGain); sirenGain.connect(master);
    sirenOsc.start();
    sirenTimer = 0; sirenHigh = false;
  }

  const bassLine = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 73.4, 65.4, 49, 0];
  function musicTick() {
    if (!ctx || muted) return;
    const step = musicStep % 16;
    const note = bassLine[step];
    if (note) tone(note, 0.22, 'triangle', 0.10);
    if (step % 2 === 0) noiseBurst(0.03, 0.05, 6000);
    musicStep++;
  }

  return {
    get muted() { return muted; },
    init() { ensure(); },
    resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    toggleMute() { this.setMuted(!muted); return muted; },
    engine(speed01, driving) {
      if (!ensure()) return;
      startEngine();
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, t, 0.08);
      engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.05 : 0.02, t, 0.1);
    },
    drift(on) {
      if (!ensure()) return;
      startDrift();
      driftGain.gain.setTargetAtTime(on ? 0.09 : 0, ctx.currentTime, 0.05);
    },
    siren(on) {
      if (!ensure()) return;
      if (on) {
        startSiren();
        sirenTimer += 1 / 60;
        if (sirenTimer > 0.42) {
          sirenTimer = 0;
          sirenHigh = !sirenHigh;
          sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 700, ctx.currentTime, 0.02);
        }
      } else if (sirenOsc) {
        sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      }
    },
    crash() { noiseBurst(0.25, 0.4, 500); tone(70, 0.25, 'sine', 0.35, 40); },
    punch() { noiseBurst(0.08, 0.25, 900); tone(140, 0.08, 'square', 0.12, 90); },
    pickup() { tone(880, 0.09, 'sine', 0.18); setTimeout(() => tone(1318, 0.14, 'sine', 0.18), 70); },
    jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.2), i * 110)); },
    click() { tone(1200, 0.04, 'square', 0.08); },
    busted() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.14), i * 160)); },
    startMusic() {
      if (musicTimer) return;
      musicTimer = setInterval(musicTick, 150);
    },
    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
  };
}
