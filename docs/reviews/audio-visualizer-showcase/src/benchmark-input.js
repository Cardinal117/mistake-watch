import { TEMPO_FIXTURES } from "./contracts.js";

const spectrum = new Float32Array(256);
const waveform = new Float32Array(512);
const tempoInput = {
  kind: "tempo",
  spectrum,
  waveform,
  bass: 0,
  mids: 0,
  highs: 0,
  tempoBpm: 120,
  phase: 0,
};

export function normalizeTempoBpm(value) {
  const numeric = Number(value);
  return TEMPO_FIXTURES.includes(numeric) ? numeric : 120;
}

export function createTempoInput(bpm, time) {
  const normalizedBpm = normalizeTempoBpm(bpm);
  const beats = (time / 60000) * normalizedBpm;
  const phase = beats - Math.floor(beats);
  const pulse = Math.exp(-phase * 7.5);
  const secondaryPulse = Math.exp(-Math.abs(phase - 0.5) * 10);
  const bass = Math.min(1, 0.14 + pulse * 0.82);
  const mids = Math.min(1, 0.12 + pulse * 0.42 + secondaryPulse * 0.28);
  const highs = Math.min(1, 0.08 + pulse * 0.24 + secondaryPulse * 0.44);
  for (let index = 0; index < spectrum.length; index += 1) {
    const ratio = index / (spectrum.length - 1);
    const rolloff = Math.pow(1 - ratio, 1.35);
    const harmonic = 0.55 + Math.sin(index * 0.19 + beats * 2.1) * 0.18;
    spectrum[index] = Math.min(
      1,
      0.025 + rolloff * harmonic * (0.28 + pulse * 0.7),
    );
  }

  for (let index = 0; index < waveform.length; index += 1) {
    const ratio = index / waveform.length;
    waveform[index] =
      Math.sin(ratio * Math.PI * 8 + beats * Math.PI * 2) *
        (0.08 + pulse * 0.34) +
      Math.sin(ratio * Math.PI * 18 - beats * Math.PI) *
        (0.035 + secondaryPulse * 0.12);
  }

  tempoInput.bass = bass;
  tempoInput.mids = mids;
  tempoInput.highs = highs;
  tempoInput.tempoBpm = normalizedBpm;
  tempoInput.phase = phase;
  return tempoInput;
}
