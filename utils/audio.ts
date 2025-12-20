
// Simple Synth using Web Audio API
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private isMusicPlaying: boolean = false;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);

      // Initialize Background Music from public folder (relative path for sub-dir support)
      this.bgMusic = new Audio('bgmusic.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = 0.2;
    } catch (e) {
      console.error('Web Audio API not supported');
    }
  }

  private async ensureContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  async playTone(freq: number, type: OscillatorType, duration: number, volume: number = 1) {
    if (!this.ctx || !this.masterGain) return;
    await this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  async playNoise(duration: number) {
    if (!this.ctx || !this.masterGain) return;
    await this.ensureContext();

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  // --- FX PRESETS ---

  playAlert() {
    // "Sci-fi alarm"
    this.playTone(880, 'square', 0.1, 0.5);
    setTimeout(() => this.playTone(660, 'square', 0.1, 0.5), 150);
  }

  playExplosion() {
    // "Boom"
    this.playNoise(0.3);
    this.playTone(100, 'sawtooth', 0.3, 0.5);
  }

  async playActivation() {
    // "Power up"
    if (!this.ctx || !this.masterGain) return;
    await this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playHeal() {
    // "Magic chime"
    this.playTone(1200, 'sine', 0.5, 0.3);
    setTimeout(() => this.playTone(1600, 'sine', 0.5, 0.3), 100);
  }

  // --- BACKGROUND MUSIC ---
  async toggleMusic() {
    if (!this.bgMusic) return;
    await this.ensureContext();

    if (this.isMusicPlaying) {
      this.bgMusic.pause();
    } else {
      try {
        await this.bgMusic.play();
      } catch (e) {
        console.error('Music play failed:', e);
      }
    }
    this.isMusicPlaying = !this.isMusicPlaying;
    return this.isMusicPlaying;
  }

  getMusicStatus() {
    return this.isMusicPlaying;
  }

  async startMusicIfPossible() {
    if (!this.bgMusic || this.isMusicPlaying) return;

    try {
      await this.ensureContext();
      await this.bgMusic.play();
      this.isMusicPlaying = true;
    } catch (e) {
      // Silent fail - often blocked by browser until user interaction
      console.log('Autoplay blocked or pending interaction');
    }
  }
}

export const soundManager = new SoundManager();
