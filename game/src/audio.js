// Synthesised WebAudio for Solmar Bay: no audio files, every sound is
// built from oscillators and noise. Everything is guarded so a browser
// without audio, or one that has not had a gesture yet, plays silently.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }
  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    resume();
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch {
      // Sound is garnish; a failed note never stops the game.
    }
  }
  function noise(dur, vol, low) {
    if (muted || !ensure()) return;
    resume();
    try {
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.25;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // Ignore.
    }
  }

  const api = {
    unlock() {
      ensure();
      resume();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'square', 0.12);
    },
    pickup() {
      tone(880, 0.09, 'sine', 0.18);
      setTimeout(() => tone(1320, 0.12, 'sine', 0.18), 70);
    },
    punch() {
      noise(0.12, 0.3, 500);
      tone(120, 0.12, 'sine', 0.25, 60);
    },
    crash() {
      noise(0.25, 0.4, 800);
      tone(90, 0.3, 'sine', 0.3, 40);
    },
    screech() {
      noise(0.3, 0.12, 2600);
    },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.2), i * 110));
    },
    busted() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sawtooth', 0.14), i * 140));
    },
    engine(speed, top) {
      if (muted) return;
      if (!ensure()) return;
      resume();
      try {
        if (!engineOsc) {
          engineOsc = ctx.createOscillator();
          engineOsc.type = 'sawtooth';
          engineGain = ctx.createGain();
          engineGain.gain.value = 0;
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 500;
          engineOsc.connect(filter);
          filter.connect(engineGain);
          engineGain.connect(master);
          engineOsc.start();
        }
        const ratio = Math.min(1, Math.abs(speed) / Math.max(1, top));
        engineOsc.frequency.value = 55 + ratio * 130;
        engineGain.gain.value = speed === 0 ? 0 : 0.045 + ratio * 0.03;
      } catch {
        // Ignore.
      }
    },
    engineOff() {
      if (engineGain) engineGain.gain.value = 0;
    },
    siren(on, dt) {
      if (!on) {
        if (sirenGain) sirenGain.gain.value = 0;
        return;
      }
      if (muted || !ensure()) return;
      resume();
      try {
        if (!sirenOsc) {
          sirenOsc = ctx.createOscillator();
          sirenOsc.type = 'sine';
          sirenGain = ctx.createGain();
          sirenGain.gain.value = 0.05;
          sirenOsc.connect(sirenGain);
          sirenGain.connect(master);
          sirenOsc.start();
        }
        sirenTimer -= dt;
        if (sirenTimer <= 0) {
          sirenHigh = !sirenHigh;
          sirenTimer = 0.42;
        }
        sirenOsc.frequency.value = sirenHigh ? 920 : 700;
        sirenGain.gain.value = muted ? 0 : 0.045;
      } catch {
        // Ignore.
      }
    },
    startMusic() {
      if (musicTimer || !ensure()) return;
      const bass = [110, 110, 131, 98, 110, 110, 147, 131];
      musicTimer = setInterval(() => {
        if (muted || !ctx) return;
        const f = bass[musicStep % bass.length];
        musicStep += 1;
        tone(f, 0.22, 'triangle', 0.07);
        if (musicStep % 2 === 0) noise(0.03, 0.03, 5000);
      }, 300);
    },
  };
  return api;
}
