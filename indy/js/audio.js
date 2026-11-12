// All sound is synthesised — no samples to download.
export function createAudio() {
  let ctx = null, master = null, verb = null;
  let muted = false, volume = 0.7;
  try { muted = localStorage.getItem('indy.muted') === '1'; } catch { /* private mode */ }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    // small synthetic room reverb
    const len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    verb = ctx.createConvolver(); verb.buffer = buf;
    const vg = ctx.createGain(); vg.gain.value = 0.22;
    verb.connect(vg); vg.connect(master);
    return ctx;
  }

  function tone(freq, { t = 0, dur = 0.3, type = 'sine', gain = 0.2, attack = 0.005, wet = 0.3, slideTo = null, detune = 0 } = {}) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + t;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.detune.value = detune;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    if (wet && verb) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise({ t = 0, dur = 0.08, gain = 0.2, freq = 2000, q = 1, type = 'bandpass', wet = 0.1 } = {}) {
    if (!ensure()) return;
    const t0 = ctx.currentTime + t;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    if (wet && verb) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); }
    src.start(t0);
  }

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PENTA = [0, 2, 4, 7, 9];

  const api = {
    unlock: () => ensure(),
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('indy.muted', m ? '1' : '0'); } catch { /* ignore */ }
      if (master) master.gain.setTargetAtTime(m ? 0 : volume, ctx.currentTime, 0.03);
    },
    get volume() { return volume; },
    setVolume(v) { volume = Math.min(1, Math.max(0, v)); if (master && !muted) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.03); },

    click() { noise({ dur: 0.025, gain: 0.12, freq: 3200, q: 2, wet: 0 }); },
    tick() { tone(1400, { dur: 0.03, gain: 0.03, type: 'square', wet: 0 }); },
    key() { noise({ dur: 0.03, gain: 0.1, freq: 1800 + Math.random() * 1400, q: 3, wet: 0.05 }); tone(140, { dur: 0.04, gain: 0.05, wet: 0 }); },
    thunk() { tone(90, { dur: 0.18, gain: 0.3, slideTo: 45, wet: 0.2 }); noise({ dur: 0.06, gain: 0.12, freq: 600, q: 1 }); },
    switch() { noise({ dur: 0.02, gain: 0.2, freq: 2400, q: 4, wet: 0.05 }); tone(220, { t: 0.01, dur: 0.05, gain: 0.08, wet: 0.05 }); },
    open() { tone(midi(72), { dur: 0.12, gain: 0.06, wet: 0.3 }); tone(midi(79), { t: 0.06, dur: 0.18, gain: 0.06, wet: 0.4 }); },
    close() { tone(midi(76), { dur: 0.1, gain: 0.05, wet: 0.3 }); tone(midi(69), { t: 0.05, dur: 0.16, gain: 0.05, wet: 0.4 }); },
    error() { tone(196, { dur: 0.16, gain: 0.12, type: 'triangle' }); tone(185, { t: 0.0, dur: 0.16, gain: 0.1, type: 'triangle' }); },
    whoosh() { noise({ dur: 0.7, gain: 0.07, freq: 500, q: 0.6, type: 'lowpass', wet: 0.5 }); },
    shutter() { noise({ dur: 0.03, gain: 0.25, freq: 3000, q: 2 }); noise({ t: 0.07, dur: 0.05, gain: 0.2, freq: 1800, q: 2 }); },
    paper() { noise({ dur: 0.22, gain: 0.07, freq: 4200, q: 0.7, wet: 0.1 }); },
    squeak() { tone(1500, { dur: 0.09, gain: 0.05, slideTo: 2300, wet: 0.2 }); tone(2100, { t: 0.1, dur: 0.07, gain: 0.04, slideTo: 1700, wet: 0.2 }); },
    blip(i = 0) { tone(midi(72 + PENTA[i % 5] + 12 * Math.floor(i / 5)), { dur: 0.25, gain: 0.07, type: 'triangle', wet: 0.5 }); },
    degauss() {
      tone(55, { dur: 1.1, gain: 0.22, type: 'sawtooth', slideTo: 48, wet: 0.2 });
      noise({ dur: 0.9, gain: 0.05, freq: 200, q: 0.5, type: 'lowpass' });
      noise({ dur: 0.05, gain: 0.2, freq: 900, q: 1 });
    },
    // A warm rising chord with a shimmer on top: our take on a workstation start-up chime.
    chime() {
      if (!ensure()) return;
      const chord = [45, 52, 57, 61, 64, 69, 76];
      chord.forEach((n, i) => {
        for (const det of [-6, 6]) tone(midi(n), { t: i * 0.055, dur: 3.2 - i * 0.12, gain: 0.05, type: i < 2 ? 'sawtooth' : 'triangle', attack: 0.25, wet: 0.6, detune: det });
      });
      [88, 93, 100].forEach((n, i) => tone(midi(n), { t: 0.5 + i * 0.13, dur: 1.6, gain: 0.02, attack: 0.01, wet: 0.9 }));
    },
    powerDown() { tone(midi(64), { dur: 0.5, gain: 0.07, slideTo: midi(40), wet: 0.4, type: 'triangle' }); noise({ t: 0.05, dur: 0.12, gain: 0.08, freq: 300, type: 'lowpass' }); },

    // --- Soft Break ---------------------------------------------------------
    // every hit in a streak climbs the scale
    note(step, { soft = false } = {}) {
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
      const n = 60 + scale[Math.min(step, scale.length - 1)];
      tone(midi(n), { dur: soft ? 0.5 : 0.9, gain: soft ? 0.05 : 0.09, type: 'sine', attack: 0.004, wet: 0.7 });
      tone(midi(n + 12), { dur: 0.35, gain: 0.025, type: 'triangle', wet: 0.7 });
    },
    squish() { tone(180, { dur: 0.12, gain: 0.12, slideTo: 90, wet: 0.2 }); },
    paddle() { tone(midi(48), { dur: 0.22, gain: 0.12, type: 'sine', wet: 0.4 }); },
    wall() { tone(midi(55), { dur: 0.1, gain: 0.04, type: 'sine', wet: 0.4 }); },
    lose() { [64, 60, 57, 52].forEach((n, i) => tone(midi(n), { t: i * 0.14, dur: 0.5, gain: 0.07, type: 'triangle', wet: 0.6 })); },
    win() { [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(midi(n), { t: i * 0.09, dur: 0.9, gain: 0.06, type: 'triangle', wet: 0.7 })); },
  };
  return api;
}
