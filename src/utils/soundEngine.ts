import { CUSTOM_JUMP_AUDIO_URL } from '../types/game';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private jumpBuffer: AudioBuffer | null = null;
  private trimStart: number = 0;
  private trimDuration: number = 0;
  private playbackRate: number = 1.0;
  private activeJumpSource: AudioBufferSourceNode | null = null;
  private fallbackAudio: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private isLoaded: boolean = false;
  private isLoading: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.fallbackAudio = new Audio(CUSTOM_JUMP_AUDIO_URL);
      this.fallbackAudio.preload = 'auto';
      // Ensure natural pitch when sped up on HTMLAudioElement
      this.applyPreservesPitch(this.fallbackAudio);
    }
  }

  private applyPreservesPitch(audio: HTMLAudioElement): void {
    const anyAudio = audio as unknown as {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    if ('preservesPitch' in anyAudio) anyAudio.preservesPitch = true;
    if ('mozPreservesPitch' in anyAudio) anyAudio.mozPreservesPitch = true;
    if ('webkitPreservesPitch' in anyAudio) anyAudio.webkitPreservesPitch = true;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.min(Math.max(rate, 1.0), 2.5);
    if (this.fallbackAudio) {
      this.fallbackAudio.playbackRate = this.playbackRate;
      this.applyPreservesPitch(this.fallbackAudio);
    }
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  /**
   * Detects leading and trailing silence in the decoded AudioBuffer so the voice
   * starts on the exact millisecond of tap and finishes without dead air.
   */
  private computeTrimBounds(buffer: AudioBuffer): void {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const len = channelData.length;
    const threshold = 0.018; // Amplitude threshold for active speech

    let firstSample = 0;
    while (firstSample < len && Math.abs(channelData[firstSample]) < threshold) {
      firstSample++;
    }

    let lastSample = len - 1;
    while (lastSample > firstSample && Math.abs(channelData[lastSample]) < threshold) {
      lastSample--;
    }

    // Leave a tiny 15ms safety margin around the voice
    const marginSamples = Math.floor(sampleRate * 0.015);
    const startSample = Math.max(0, firstSample - marginSamples);
    const endSample = Math.min(len, lastSample + marginSamples);

    if (endSample > startSample) {
      this.trimStart = startSample / sampleRate;
      this.trimDuration = (endSample - startSample) / sampleRate;
    } else {
      this.trimStart = 0;
      this.trimDuration = buffer.duration;
    }
  }

  public async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Ignore resume errors prior to user gesture
      }
    }

    if (!this.isLoaded && !this.isLoading && this.ctx) {
      this.isLoading = true;
      try {
        const response = await fetch(CUSTOM_JUMP_AUDIO_URL);
        const arrayBuffer = await response.arrayBuffer();
        this.jumpBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.computeTrimBounds(this.jumpBuffer);
        this.isLoaded = true;
      } catch {
        // Fallback HTMLAudioElement will handle playback if decode fails
      } finally {
        this.isLoading = false;
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopActiveJumpAudio();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public stopActiveJumpAudio(): void {
    if (this.activeJumpSource) {
      try {
        this.activeJumpSource.stop();
        this.activeJumpSource.disconnect();
      } catch {
        // Already stopped
      }
      this.activeJumpSource = null;
    }
    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.pause();
        this.fallbackAudio.currentTime = this.trimStart || 0;
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Immediately restarts and plays the user's custom jump audio clip at accelerated speed
   * with trimmed leading/trailing silence so the full voice word completes before the next jump!
   */
  public playJumpSound(): void {
    if (this.isMuted) return;

    if (!this.ctx || !this.isLoaded) {
      void this.init();
    } else if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.stopActiveJumpAudio();

    // Primary playback via pitch-preserved accelerated HTMLAudioElement or Web Audio Buffer
    // Note: Web Audio BufferSource playbackRate is ultra-low-latency on mobile & desktop
    if (this.ctx && this.jumpBuffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = this.jumpBuffer;
        source.playbackRate.value = this.playbackRate;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 1.05;

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const startOffset = this.trimStart;
        const duration = this.trimDuration > 0 ? this.trimDuration : this.jumpBuffer.duration;

        source.start(0, startOffset, duration);
        this.activeJumpSource = source;
        source.onended = () => {
          if (this.activeJumpSource === source) {
            this.activeJumpSource = null;
          }
        };
        return;
      } catch {
        // Fall through to HTMLAudioElement fallback
      }
    }

    if (this.fallbackAudio) {
      try {
        this.fallbackAudio.playbackRate = this.playbackRate;
        this.applyPreservesPitch(this.fallbackAudio);
        this.fallbackAudio.currentTime = this.trimStart || 0;
        const playPromise = this.fallbackAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Ignore autoplay restriction errors
          });
        }
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Classic Flappy Bird coin/point chime (B5 -> E6 two-tone arcade ping)
   */
  public playScoreSound(): void {
    if (this.isMuted) return;
    if (!this.ctx) {
      void this.init();
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.075); // E6

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.33);
  }

  /**
   * Classic retro thud + descending slide on pipe/ground collision
   */
  public playCollisionSound(): void {
    if (this.isMuted) return;
    if (!this.ctx) {
      void this.init();
      return;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const soundEngine = new SoundEngine();
