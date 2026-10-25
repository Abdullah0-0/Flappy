import { VOICE_AUDIOS, VoiceAudioId } from '../types/game';

interface AudioBufferEntry {
  buffer: AudioBuffer;
  trimStart: number;
  trimDuration: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentAudioId: VoiceAudioId = 'saad_1';
  private buffers: Partial<Record<VoiceAudioId, AudioBufferEntry>> = {};
  private fallbackAudios: Partial<Record<VoiceAudioId, HTMLAudioElement>> = {};
  private playbackRate: number = 1.0;
  private activeJumpSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private isLoaded: boolean = false;
  private isPreloading: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      (Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).forEach((id) => {
        const audio = new Audio(VOICE_AUDIOS[id].url);
        audio.preload = 'auto';
        this.applyPreservesPitch(audio);
        this.fallbackAudios[id] = audio;
      });
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

  public setVoiceAudio(id: VoiceAudioId): void {
    this.currentAudioId = id;
    this.stopActiveJumpAudio();
    if (this.ctx && !this.buffers[id]) {
      void this.loadAudioClip(id);
    }
  }

  public getVoiceAudio(): VoiceAudioId {
    return this.currentAudioId;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.min(Math.max(rate, 1.0), 2.5);
    Object.values(this.fallbackAudios).forEach((audio) => {
      if (audio) {
        audio.playbackRate = this.playbackRate;
        this.applyPreservesPitch(audio);
      }
    });
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  /**
   * Detects leading and trailing silence in the decoded AudioBuffer so the voice
   * starts on the exact millisecond of tap and finishes without dead air.
   */
  private computeTrimBounds(buffer: AudioBuffer): { start: number; duration: number } {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const len = channelData.length;
    const threshold = 0.015; // Amplitude threshold for active speech

    let firstSample = 0;
    while (firstSample < len && Math.abs(channelData[firstSample]) < threshold) {
      firstSample++;
    }

    let lastSample = len - 1;
    while (lastSample > firstSample && Math.abs(channelData[lastSample]) < threshold) {
      lastSample--;
    }

    const marginSamples = Math.floor(sampleRate * 0.012);
    const startSample = Math.max(0, firstSample - marginSamples);
    const endSample = Math.min(len, lastSample + marginSamples);

    if (endSample > startSample) {
      return {
        start: startSample / sampleRate,
        duration: (endSample - startSample) / sampleRate,
      };
    }
    return {
      start: 0,
      duration: buffer.duration,
    };
  }

  private async loadAudioClip(id: VoiceAudioId): Promise<void> {
    if (!this.ctx) return;
    try {
      const url = VOICE_AUDIOS[id].url;
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      const trim = this.computeTrimBounds(decodedBuffer);
      this.buffers[id] = {
        buffer: decodedBuffer,
        trimStart: trim.start,
        trimDuration: trim.duration,
      };
    } catch {
      // Fallback HTMLAudioElement will handle playback
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

    if (!this.isLoaded && !this.isPreloading && this.ctx) {
      this.isPreloading = true;
      try {
        // Preload all voice clips in parallel
        await Promise.all(
          (Object.keys(VOICE_AUDIOS) as VoiceAudioId[]).map((id) => this.loadAudioClip(id))
        );
        this.isLoaded = true;
      } finally {
        this.isPreloading = false;
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
    const currentFallback = this.fallbackAudios[this.currentAudioId];
    if (currentFallback) {
      try {
        currentFallback.pause();
        currentFallback.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Immediately restarts and plays the selected custom voice audio clip (khizu, saad 1, or saad 2)
   */
  public playJumpSound(): void {
    if (this.isMuted) return;

    if (!this.ctx || !this.isLoaded) {
      void this.init();
    } else if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.stopActiveJumpAudio();

    const entry = this.buffers[this.currentAudioId];
    if (this.ctx && entry) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = entry.buffer;
        source.playbackRate.value = this.playbackRate;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 1.05;

        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        const startOffset = entry.trimStart;
        const duration = entry.trimDuration > 0 ? entry.trimDuration : entry.buffer.duration;

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

    const fallback = this.fallbackAudios[this.currentAudioId];
    if (fallback) {
      try {
        fallback.playbackRate = this.playbackRate;
        this.applyPreservesPitch(fallback);
        fallback.currentTime = entry?.trimStart || 0;
        const playPromise = fallback.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Ignore autoplay errors
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
