import type { GameId, GameManifest } from '../assets/AssetLoader.ts';

export interface SoundAsset {
  readonly member: number;
  readonly name: string;
  readonly buffer: AudioBuffer;
  readonly loop: boolean;
}

interface ChannelState {
  member: number;
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  playing: boolean;
  paused: boolean;
  loop: boolean;
  startTime: number;
  offsetSec: number;
  durationSec: number;
}

export interface AudioContextLike {
  readonly state: AudioContextState;
  readonly currentTime: number;
  readonly destination: AudioNode;
  resume(): Promise<void>;
  decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
  createBufferSource(): AudioBufferSourceNode;
  createGain(): GainNode;
  close(): Promise<void>;
}

export class SoundEngine {
  private ctx: AudioContextLike | null = null;
  private masterGain: GainNode | null = null;
  private readonly channels = new Map<number, ChannelState>();
  private readonly buffers = new Map<number, SoundAsset>();
  private readonly createCtx: () => AudioContextLike;
  private masterVolume = 0.8;
  private muted = false;

  constructor(createContext?: () => AudioContextLike) {
    this.createCtx =
      createContext ??
      (() => {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        return new Ctor();
      });
  }

  private ensureContext(): AudioContextLike | null {
    if (!this.ctx) {
      if (typeof window === 'undefined' && !this.createCtx) return null;
      try {
        this.ctx = this.createCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  public async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public registerBuffer(member: number, name: string, buffer: AudioBuffer, loop: boolean): void {
    this.buffers.set(member, { member, name, buffer, loop });
  }

  public async loadGameSounds(gameId: GameId, manifest: GameManifest): Promise<void> {
    this.stopAll();
    this.buffers.clear();
    const ctx = this.ensureContext();
    if (!ctx) return;

    const base = `/assets/${gameId}`;
    const tasks: Promise<void>[] = [];
    for (const m of manifest.members) {
      if (m.type === 6 && m.file) {
        const loop = Boolean(m.sound?.loop);
        tasks.push(
          fetch(`${base}/${m.file}`)
            .then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.arrayBuffer();
            })
            .then((ab) => ctx.decodeAudioData(ab))
            .then((buf) => {
              this.registerBuffer(m.member, m.name, buf, loop);
            })
            .catch(() => {})
        );
      }
    }
    await Promise.all(tasks);
  }



  private getOrCreateChannel(channel: number): ChannelState | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return null;
    let st = this.channels.get(channel);
    if (!st) {
      const gain = ctx.createGain();
      gain.connect(this.masterGain);
      st = {
        member: 0,
        source: null,
        gain,
        playing: false,
        paused: false,
        loop: false,
        startTime: 0,
        offsetSec: 0,
        durationSec: 0,
      };
      this.channels.set(channel, st);
    }
    return st;
  }

  private startChannelNode(st: ChannelState, asset: SoundAsset, offsetSec: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (st.source) {
      try {
        st.source.onended = null;
        st.source.stop();
        st.source.disconnect();
      } catch {
        // already stopped
      }
      st.source = null;
    }

    const src = ctx.createBufferSource();
    src.buffer = asset.buffer;
    src.loop = asset.loop;
    src.connect(st.gain);

    const dur = asset.buffer.duration || 0;
    const safeOffset = asset.loop && dur > 0 ? offsetSec % dur : Math.min(offsetSec, dur);
    st.member = asset.member;
    st.source = src;
    st.playing = true;
    st.paused = false;
    st.loop = asset.loop;
    st.startTime = ctx.currentTime - safeOffset;
    st.offsetSec = safeOffset;
    st.durationSec = dur;

    src.onended = () => {
      if (st.source === src && !st.paused && !st.loop) {
        st.playing = false;
        st.source = null;
        st.offsetSec = 0;
      }
    };
    src.start(0, safeOffset);
  }

  /** Director puppetSound(channel, memberNum) — member 0 stops the channel. */
  public puppetSound(channel: number, memberNum: number): void {
    if (memberNum <= 0) {
      this.stop(channel);
      return;
    }
    const asset = this.buffers.get(memberNum);
    if (!asset) return;
    const st = this.getOrCreateChannel(channel);
    if (!st) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.startChannelNode(st, asset, 0);
  }

  public soundBusy(channel: number): boolean {
    const st = this.channels.get(channel);
    if (!st || !st.playing || st.paused || !this.ctx) return false;
    if (st.loop) return true;
    return this.ctx.currentTime < st.startTime + st.durationSec;
  }

  public getChannelMember(channel: number): number {
    return this.soundBusy(channel) ? (this.channels.get(channel)?.member ?? 0) : 0;
  }

  public pause(channel: number): void {
    const st = this.channels.get(channel);
    if (!st || !st.playing || st.paused || !this.ctx) return;
    st.offsetSec = Math.max(0, this.ctx.currentTime - st.startTime);
    st.paused = true;
    st.playing = false;
    if (st.source) {
      try {
        st.source.onended = null;
        st.source.stop();
        st.source.disconnect();
      } catch {
        // ignore
      }
      st.source = null;
    }
  }

  public play(channel: number): void {
    const st = this.channels.get(channel);
    if (!st || !st.paused || st.member <= 0) return;
    const asset = this.buffers.get(st.member);
    if (!asset) return;
    this.startChannelNode(st, asset, st.offsetSec);
  }

  public stop(channel: number): void {
    const st = this.channels.get(channel);
    if (!st) return;
    st.playing = false;
    st.paused = false;
    st.offsetSec = 0;
    if (st.source) {
      try {
        st.source.onended = null;
        st.source.stop();
        st.source.disconnect();
      } catch {
        // ignore
      }
      st.source = null;
    }
  }

  public stopAll(): void {
    for (const ch of this.channels.keys()) {
      this.stop(ch);
    }
  }

  public dispose(): void {
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
