// Procedural sound only: tiny WebAudio bleeps and a sizzle made from filtered
// noise. No audio files, no network. Sound starts on the first user gesture,
// as browsers require.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      ctx = new AudioCtx();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, seconds, type = 'sine', gain = 0.12, when = 0) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  }

  function noiseBurst(seconds, gain = 0.08) {
    const ac = ensure();
    if (!ac || muted) return;
    const len = Math.floor(ac.sampleRate * seconds);
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(filter).connect(g).connect(ac.destination);
    src.start();
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') void ac.resume();
    },
    click() {
      tone(660, 0.06, 'triangle', 0.06);
    },
    pickup() {
      tone(520, 0.07, 'triangle', 0.08);
      tone(780, 0.06, 'triangle', 0.05, 0.05);
    },
    place() {
      tone(392, 0.08, 'triangle', 0.09);
    },
    sizzleStart() {
      const ac = ensure();
      if (!ac || muted || sizzle) return;
      const len = ac.sampleRate;
      const buffer = ac.createBuffer(1, len, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5200;
      filter.Q.value = 0.6;
      const g = ac.createGain();
      g.gain.value = 0.035;
      src.connect(filter).connect(g).connect(ac.destination);
      src.start();
      sizzle = { src, g };
    },
    sizzleStop() {
      if (!sizzle) return;
      try {
        sizzle.g.gain.linearRampToValueAtTime(0, (ctx?.currentTime ?? 0) + 0.15);
        sizzle.src.stop((ctx?.currentTime ?? 0) + 0.2);
      } catch {
        // Already stopped.
      }
      sizzle = null;
    },
    ding() {
      tone(880, 0.12, 'sine', 0.1);
      tone(1318, 0.18, 'sine', 0.08, 0.09);
    },
    served() {
      tone(523, 0.1, 'triangle', 0.1);
      tone(659, 0.1, 'triangle', 0.1, 0.09);
      tone(784, 0.16, 'triangle', 0.11, 0.18);
    },
    bad() {
      tone(220, 0.16, 'sawtooth', 0.05);
      tone(185, 0.2, 'sawtooth', 0.05, 0.1);
    },
    walkout() {
      tone(330, 0.12, 'square', 0.05);
      tone(262, 0.22, 'square', 0.05, 0.11);
    },
    pop() {
      noiseBurst(0.12, 0.07);
      tone(1046, 0.07, 'sine', 0.07);
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.sizzleStop();
      return muted;
    },
  };
}
