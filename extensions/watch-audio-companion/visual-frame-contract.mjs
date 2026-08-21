export const VISUAL_FRAME_VERSION = 1;
export const VISUAL_SPECTRUM_BANDS = 48;
export const VISUAL_WAVEFORM_POINTS = 96;

export function createVisualFrameV1({
  frequencyBytes,
  sampledAtSeconds,
  sequence,
  waveformBytes,
}) {
  if (!frequencyBytes?.length || !waveformBytes?.length) {
    return null;
  }

  return normalizeVisualFrameV1({
    sampledAtSeconds,
    sequence,
    spectrum: compressSpectrum(frequencyBytes),
    version: VISUAL_FRAME_VERSION,
    waveform: compressWaveform(waveformBytes),
  });
}

export function normalizeVisualFrameV1(value) {
  if (
    value?.version !== VISUAL_FRAME_VERSION ||
    !Number.isFinite(value.sequence) ||
    value.sequence < 0 ||
    !Number.isFinite(value.sampledAtSeconds) ||
    value.sampledAtSeconds < 0
  ) {
    return null;
  }

  const spectrum = normalizeByteArray(value.spectrum, VISUAL_SPECTRUM_BANDS);
  const waveform = normalizeByteArray(value.waveform, VISUAL_WAVEFORM_POINTS);
  if (!spectrum || !waveform) {
    return null;
  }

  return Object.freeze({
    sampledAtSeconds: value.sampledAtSeconds,
    sequence: Math.floor(value.sequence),
    spectrum: Object.freeze(spectrum),
    version: VISUAL_FRAME_VERSION,
    waveform: Object.freeze(waveform),
  });
}

function compressSpectrum(values) {
  const result = new Array(VISUAL_SPECTRUM_BANDS);
  const highestBin = Math.max(2, Math.floor(values.length * 0.72));
  const logarithmicRange = Math.log(highestBin + 1);
  let start = 0;

  for (let band = 0; band < result.length; band += 1) {
    const end = Math.max(
      start + 1,
      Math.floor(Math.exp(((band + 1) / result.length) * logarithmicRange) - 1),
    );
    let peak = 0;
    let total = 0;
    let count = 0;

    for (let index = start; index < Math.min(end, values.length); index += 1) {
      const sample = normalizeByte(values[index]);
      peak = Math.max(peak, sample);
      total += sample;
      count += 1;
    }

    const average = count > 0 ? total / count : 0;
    result[band] = normalizeByte(average * 0.72 + peak * 0.28);
    start = Math.min(end, highestBin);
  }

  return result;
}

function compressWaveform(values) {
  const result = new Array(VISUAL_WAVEFORM_POINTS);
  const sourceLast = Math.max(0, values.length - 1);

  for (let index = 0; index < result.length; index += 1) {
    const sourceIndex = Math.round((index / (result.length - 1)) * sourceLast);
    result[index] = normalizeByte(values[sourceIndex]);
  }

  return result;
}

function normalizeByteArray(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) {
    return null;
  }

  return value.map(normalizeByte);
}

function normalizeByte(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(255, Math.max(0, Math.round(value)));
}
