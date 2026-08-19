const DEFAULT_MIN_BPM = 40;
const DEFAULT_MAX_BPM = 240;
const CLUSTER_TOLERANCE = 0.035;

export function estimateTempo(
  onsetTimes,
  {
    autocorrelationCandidates = [],
    previousBpm = null,
    minimumBpm = DEFAULT_MIN_BPM,
    maximumBpm = DEFAULT_MAX_BPM,
  } = {},
) {
  const times = onsetTimes
    .filter(Number.isFinite)
    .filter((value) => value >= 0)
    .toSorted((left, right) => left - right)
    .slice(-48);

  if (times.length < 4) {
    return unlockedTempo();
  }

  const candidates = collectCandidates(times, {
    maximumBpm,
    minimumBpm,
    previousBpm,
  });
  appendAutocorrelationCandidates(candidates, autocorrelationCandidates, {
    maximumBpm,
    minimumBpm,
    previousBpm,
  });

  if (candidates.length < 3) {
    return unlockedTempo();
  }

  const cluster = selectBestCluster(candidates, previousBpm);
  const bpm = weightedMean(cluster);
  const intervalSeconds = 60 / bpm;
  const deviation = weightedDeviation(cluster, bpm);
  const consistency = Math.max(0, 1 - deviation / Math.max(1, bpm * 0.05));
  const evidence = Math.min(1, (times.length - 3) / 12);
  const confidence = clampUnit(consistency * evidence);
  const beatOffsetSeconds = positiveModulo(times.at(-1), intervalSeconds);

  return {
    beatIntervalSeconds: intervalSeconds,
    beatOffsetSeconds,
    bpm,
    confidence,
  };
}

export function findAutocorrelationTempoCandidates(
  samples,
  sampleIntervalSeconds,
  { minimumBpm = DEFAULT_MIN_BPM, maximumBpm = DEFAULT_MAX_BPM } = {},
) {
  if (
    samples.length < 8 ||
    !Number.isFinite(sampleIntervalSeconds) ||
    sampleIntervalSeconds <= 0
  ) {
    return [];
  }

  const minimumLag = Math.max(
    1,
    Math.round(60 / maximumBpm / sampleIntervalSeconds),
  );
  const maximumLag = Math.min(
    samples.length - 1,
    Math.round(60 / minimumBpm / sampleIntervalSeconds),
  );
  const candidates = [];

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let cross = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let index = lag; index < samples.length; index += 1) {
      const left = Math.max(0, samples[index] ?? 0);
      const right = Math.max(0, samples[index - lag] ?? 0);
      cross += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const correlation = cross / Math.sqrt(leftEnergy * rightEnergy || 1);
    if (correlation > 0.05) {
      candidates.push({
        bpm: 60 / (lag * sampleIntervalSeconds),
        correlation,
      });
    }
  }

  return candidates
    .toSorted((left, right) => right.correlation - left.correlation)
    .filter(
      (candidate, index, values) =>
        values.findIndex(
          (value) => Math.abs(value.bpm - candidate.bpm) / candidate.bpm < 0.03,
        ) === index,
    )
    .slice(0, 6);
}

export function foldTempoNearReference(
  candidate,
  reference,
  minimumBpm = DEFAULT_MIN_BPM,
  maximumBpm = DEFAULT_MAX_BPM,
) {
  if (!Number.isFinite(candidate) || !Number.isFinite(reference)) {
    return candidate;
  }

  const options = [];
  for (const multiplier of [0.25, 0.5, 1, 2, 4]) {
    const value = candidate * multiplier;
    if (value >= minimumBpm && value <= maximumBpm) {
      options.push(value);
    }
  }

  return options.toSorted(
    (left, right) =>
      Math.abs(Math.log2(left / reference)) -
      Math.abs(Math.log2(right / reference)),
  )[0];
}

function collectCandidates(times, options) {
  const candidates = [];

  for (let index = 1; index < times.length; index += 1) {
    const maximumStep = Math.min(4, index);

    for (let step = 1; step <= maximumStep; step += 1) {
      const secondsPerBeat = (times[index] - times[index - step]) / step;
      let bpm = 60 / secondsPerBeat;

      if (Number.isFinite(options.previousBpm)) {
        bpm = foldTempoNearReference(
          bpm,
          options.previousBpm,
          options.minimumBpm,
          options.maximumBpm,
        );
      }

      if (bpm >= options.minimumBpm && bpm <= options.maximumBpm) {
        candidates.push({ bpm, weight: 1 / step });
      }
    }
  }

  return candidates;
}

function appendAutocorrelationCandidates(candidates, values, options) {
  for (const value of values) {
    let bpm = value?.bpm;

    if (Number.isFinite(options.previousBpm)) {
      bpm = foldTempoNearReference(
        bpm,
        options.previousBpm,
        options.minimumBpm,
        options.maximumBpm,
      );
    }

    if (
      Number.isFinite(bpm) &&
      bpm >= options.minimumBpm &&
      bpm <= options.maximumBpm
    ) {
      candidates.push({
        bpm,
        weight: clampUnit(value.correlation) * 0.5,
      });
    }
  }
}

function selectBestCluster(candidates, previousBpm) {
  let best = [candidates[0]];
  let bestScore = -1;

  for (const center of candidates) {
    const cluster = candidates.filter(
      (candidate) =>
        Math.abs(candidate.bpm - center.bpm) / center.bpm <= CLUSTER_TOLERANCE,
    );
    let score = cluster.reduce((sum, candidate) => sum + candidate.weight, 0);

    if (Number.isFinite(previousBpm)) {
      score -= Math.abs(Math.log2(center.bpm / previousBpm)) * 0.25;
    }

    if (score > bestScore) {
      best = cluster;
      bestScore = score;
    }
  }

  return best;
}

function weightedDeviation(values, mean) {
  const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
  return (
    values.reduce(
      (sum, value) => sum + Math.abs(value.bpm - mean) * value.weight,
      0,
    ) / totalWeight
  );
}

function weightedMean(values) {
  const totalWeight = values.reduce((sum, value) => sum + value.weight, 0);
  return (
    values.reduce((sum, value) => sum + value.bpm * value.weight, 0) /
    totalWeight
  );
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function clampUnit(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function unlockedTempo() {
  return {
    beatIntervalSeconds: null,
    beatOffsetSeconds: null,
    bpm: null,
    confidence: 0,
  };
}
