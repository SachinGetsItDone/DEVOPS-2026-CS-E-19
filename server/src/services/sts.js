'use strict';

const config = require('../config');

// Build a 16-bit mono PCM WAV buffer locally - the honest offline fallback so
// audio always works, even with no NVIDIA key and no network.
function syntheticWav(text, sampleRate = config.SAMPLE_RATE) {
  const chars = Math.max(1, String(text || '').length);
  const seconds = Math.max(0.35, Math.min(8, chars * 0.055));
  const numSamples = Math.floor(sampleRate * seconds);
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  const base = 180 + (chars % 7) * 12; // deterministic pitch per question
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const envelope = Math.min(1, i / (sampleRate * 0.05)) * Math.min(1, (numSamples - i) / (sampleRate * 0.15));
    const wave =
      Math.sin(2 * Math.PI * base * t) * 0.55 +
      Math.sin(2 * Math.PI * base * 1.5 * t) * 0.25 +
      Math.sin(2 * Math.PI * base * 2.02 * t) * 0.12;
    buffer.writeInt16LE(Math.round(wave * envelope * 0.5 * 32767), 44 + i * 2);
  }
  return buffer;
}

class STSService {
  constructor() {
    this.hasKey = Boolean(config.NVIDIA_API_KEY);
    if (!this.hasKey) console.warn('[sts] NVIDIA_API_KEY not set - using synthetic WAV fallback.');
  }

  async synthesizeText(text) {
    const started = Date.now();
    if (this.hasKey) {
      try {
        const res = await fetch(`${config.NVIDIA_TTS_URL}/audio/speech`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
            Accept: 'audio/wav',
          },
          body: JSON.stringify({
            model: config.NVIDIA_TTS_MODEL,
            voice: config.NVIDIA_TTS_VOICE,
            input: String(text || '').slice(0, 2000),
            response_format: 'wav',
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) throw new Error(`NVIDIA TTS responded ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return { audio: buf, latency_ms: Date.now() - started, model: config.NVIDIA_TTS_MODEL };
      } catch (err) {
        console.warn(`[sts] NVIDIA TTS failed, using fallback: ${err.message}`);
      }
    }
    return {
      audio: syntheticWav(text),
      latency_ms: Date.now() - started,
      model: 'synthetic-audio-fallback',
    };
  }
}

module.exports = { STSService, syntheticWav };
