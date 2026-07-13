export type QueuePerformanceMeasure = {
  detail?: Record<string, unknown>;
  label: string;
  startedAt: number;
};

type QueueMetadataSnapshot = {
  activeRequests: number;
  peakConcurrency: number;
  requestCount: number;
};

let activeMetadataRequests = 0;
let metadataRequestCount = 0;
let peakMetadataConcurrency = 0;

export function startQueuePerformanceMeasure(
  label: string,
  detail?: Record<string, unknown>,
): QueuePerformanceMeasure | null {
  if (!queuePerformanceEnabled()) {
    return null;
  }

  return {
    detail,
    label,
    startedAt: performance.now(),
  };
}

export function completeQueuePerformanceMeasure(
  measure: QueuePerformanceMeasure | null,
  detail?: Record<string, unknown>,
) {
  if (!measure || !queuePerformanceEnabled()) {
    return null;
  }

  const durationMs = Math.max(0, performance.now() - measure.startedAt);
  const combinedDetail = { ...measure.detail, ...detail };

  performance.measure(`mistake-watch:queue:${measure.label}`, {
    detail: combinedDetail,
    duration: durationMs,
    start: measure.startedAt,
  });
  console.info("[Mistake Watch] queue performance", measure.label, {
    durationMs: Math.round(durationMs * 100) / 100,
    ...combinedDetail,
  });

  return durationMs;
}

export function recordQueuePerformanceGauge(
  label: string,
  value: number,
  detail?: Record<string, unknown>,
) {
  if (!queuePerformanceEnabled()) {
    return;
  }

  performance.mark(`mistake-watch:queue:${label}`, {
    detail: { ...detail, value },
  });
}

export function beginQueueMetadataRequest(detail?: Record<string, unknown>) {
  if (!queuePerformanceEnabled()) {
    return () => undefined;
  }

  metadataRequestCount += 1;
  activeMetadataRequests += 1;
  peakMetadataConcurrency = Math.max(
    peakMetadataConcurrency,
    activeMetadataRequests,
  );
  recordMetadataSnapshot("metadata-request-start", detail);
  let completed = false;

  return () => {
    if (completed) {
      return;
    }

    completed = true;
    activeMetadataRequests = Math.max(0, activeMetadataRequests - 1);
    recordMetadataSnapshot("metadata-request-end", detail);
  };
}

export function getQueueMetadataPerformanceSnapshot(): QueueMetadataSnapshot {
  return {
    activeRequests: activeMetadataRequests,
    peakConcurrency: peakMetadataConcurrency,
    requestCount: metadataRequestCount,
  };
}

export function resetQueueMetadataPerformanceSnapshot() {
  activeMetadataRequests = 0;
  metadataRequestCount = 0;
  peakMetadataConcurrency = 0;
}

function recordMetadataSnapshot(
  label: string,
  detail?: Record<string, unknown>,
) {
  const snapshot = getQueueMetadataPerformanceSnapshot();

  recordQueuePerformanceGauge(label, snapshot.activeRequests, {
    ...detail,
    ...snapshot,
  });
}

function queuePerformanceEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    typeof performance !== "undefined"
  );
}
