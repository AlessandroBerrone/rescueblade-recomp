import { describe, expect, it } from 'vitest';
import { SoundEngine, type AudioContextLike } from '../SoundEngine.ts';

function makeMockAudioContext() {
  let currentTime = 0;
  const started: { offset: number; loop: boolean; stopped: boolean }[] = [];
  const masterGain = { gain: { value: 1 }, connect: () => {} } as unknown as GainNode;

  const ctx: AudioContextLike = {
    state: 'running',
    get currentTime() {
      return currentTime;
    },
    destination: {} as AudioNode,
    resume: async () => {},
    decodeAudioData: async () => ({ duration: 1 } as AudioBuffer),
    createGain: () => masterGain,
    createBufferSource: () => {
      const rec = { offset: 0, loop: false, stopped: false };
      started.push(rec);
      return {
        buffer: null,
        set loop(v: boolean) {
          rec.loop = v;
        },
        get loop() {
          return rec.loop;
        },
        onended: null,
        connect: () => {},
        disconnect: () => {},
        start: (_when?: number, offset = 0) => {
          rec.offset = offset;
        },
        stop: () => {
          rec.stopped = true;
        },
      } as unknown as AudioBufferSourceNode;
    },
    close: async () => {},
  };

  return {
    ctx,
    started,
    advanceTime: (dt: number) => {
      currentTime += dt;
    },
  };
}

describe('SoundEngine', () => {
  it('handles puppetSound, soundBusy, and puppetSound(ch, 0) stop', () => {
    const mock = makeMockAudioContext();
    const snd = new SoundEngine(() => mock.ctx);
    snd.registerBuffer(8, 'getPOints', { duration: 1.5 } as AudioBuffer, false);
    snd.registerBuffer(7, 'copterengine', { duration: 2.0 } as AudioBuffer, true);

    expect(snd.soundBusy(3)).toBe(false);
    snd.puppetSound(3, 8);
    expect(snd.soundBusy(3)).toBe(true);

    mock.advanceTime(1.6);
    expect(snd.soundBusy(3)).toBe(false);

    snd.puppetSound(1, 7);
    mock.advanceTime(10);
    expect(snd.soundBusy(1)).toBe(true); // looping remains busy

    snd.puppetSound(1, 0);
    expect(snd.soundBusy(1)).toBe(false);
  });

  it('pauses and resumes from saved offset', () => {
    const mock = makeMockAudioContext();
    const snd = new SoundEngine(() => mock.ctx);
    snd.registerBuffer(7, 'copterengine', { duration: 2.0 } as AudioBuffer, true);

    snd.puppetSound(1, 7);
    mock.advanceTime(1.25);
    snd.pause(1);
    expect(snd.soundBusy(1)).toBe(false);
    expect(mock.started[0].stopped).toBe(true);

    snd.play(1);
    expect(snd.soundBusy(1)).toBe(true);
    expect(mock.started[1].offset).toBeCloseTo(1.25, 5);
  });
});
