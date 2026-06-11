import type { PlaybackSourceKind } from "./types";

export type WaveformSourceKind =
  | "direct_media"
  | "hls_media"
  | "r2_media"
  | "stream_media"
  | "youtube_embed";

export type WaveformAnalysisMode =
  | "browser_analyser"
  | "fallback_progress"
  | "precomputed_peaks"
  | "static";

export type WaveformStatus = "failed" | "missing" | "pending" | "ready";

export type WaveformMetadataContract = {
  waveform_peaks_key?: string | null;
  waveform_peaks_url?: string | null;
  waveform_status?: WaveformStatus | null;
};

export type FirstPartyWaveformAsset = WaveformMetadataContract & {
  kind: "r2_media" | "stream_media";
  sourceUrl?: string | null;
};

export type WaveformResolveEnvironment = {
  allowLiveAnalysis?: boolean;
  mobileConstrained?: boolean;
  reducedMotion?: boolean;
};

export type WaveformResolveInput = WaveformMetadataContract & {
  firstPartyAsset?: FirstPartyWaveformAsset | null;
  sourceType?: PlaybackSourceKind | WaveformSourceKind | null;
  sourceUrl?: string | null;
};

export type WaveformSourcePlan = {
  analysisMode: WaveformAnalysisMode;
  contract: Required<WaveformMetadataContract>;
  kind: WaveformSourceKind;
  reason: string;
  supportsLiveAnalysis: boolean;
  usesIframeAudio: boolean;
};

const EMPTY_WAVEFORM_CONTRACT: Required<WaveformMetadataContract> = {
  waveform_peaks_key: null,
  waveform_peaks_url: null,
  waveform_status: "missing",
};

export function resolveWaveformSource(
  input: WaveformResolveInput,
  environment: WaveformResolveEnvironment = {},
): WaveformSourcePlan {
  const firstPartyAsset = normalizeFirstPartyAsset(input.firstPartyAsset);

  if (firstPartyAsset) {
    return resolveFirstPartyPlan(firstPartyAsset, environment);
  }

  const kind = normalizeWaveformKind(input.sourceType);
  const contract = normalizeWaveformContract(input);

  if (kind === "youtube_embed") {
    return {
      analysisMode: environment.reducedMotion ? "static" : "fallback_progress",
      contract,
      kind,
      reason:
        "YouTube iframe audio cannot be sampled directly; use an honest fallback unless a ready first-party asset is matched.",
      supportsLiveAnalysis: false,
      usesIframeAudio: true,
    };
  }

  if (kind === "r2_media" || kind === "stream_media") {
    return resolveFirstPartyPlan({ ...contract, kind }, environment);
  }

  if (environment.reducedMotion) {
    return {
      analysisMode: "static",
      contract,
      kind,
      reason:
        "Reduced-motion users receive a stable non-animated waveform representation.",
      supportsLiveAnalysis: false,
      usesIframeAudio: false,
    };
  }

  if (environment.mobileConstrained) {
    return {
      analysisMode: "fallback_progress",
      contract,
      kind,
      reason:
        "Mobile-constrained clients avoid heavy live audio analysis by default.",
      supportsLiveAnalysis: false,
      usesIframeAudio: false,
    };
  }

  if (environment.allowLiveAnalysis) {
    return {
      analysisMode: "browser_analyser",
      contract,
      kind,
      reason:
        "Direct browser media can feed an AnalyserNode when CORS and browser support permit it.",
      supportsLiveAnalysis: true,
      usesIframeAudio: false,
    };
  }

  return {
    analysisMode: "fallback_progress",
    contract,
    kind,
    reason:
      "Live analysis is not confirmed for this client/source, so the UI uses a lightweight progress visual.",
    supportsLiveAnalysis: false,
    usesIframeAudio: false,
  };
}

export function hasReadyWaveformPeaks(contract: WaveformMetadataContract) {
  return (
    contract.waveform_status === "ready" &&
    Boolean(contract.waveform_peaks_url || contract.waveform_peaks_key)
  );
}

function resolveFirstPartyPlan(
  asset: FirstPartyWaveformAsset,
  environment: WaveformResolveEnvironment,
): WaveformSourcePlan {
  const contract = normalizeWaveformContract(asset);
  const readyPeaks = hasReadyWaveformPeaks(contract);

  if (readyPeaks) {
    return {
      analysisMode: "precomputed_peaks",
      contract,
      kind: asset.kind,
      reason:
        "Ready first-party waveform peaks are preferred over runtime analysis.",
      supportsLiveAnalysis: false,
      usesIframeAudio: false,
    };
  }

  if (environment.reducedMotion) {
    return {
      analysisMode: "static",
      contract,
      kind: asset.kind,
      reason:
        "First-party media has no ready peaks yet and reduced motion is enabled.",
      supportsLiveAnalysis: false,
      usesIframeAudio: false,
    };
  }

  if (asset.kind === "r2_media" && !environment.mobileConstrained) {
    return {
      analysisMode: environment.allowLiveAnalysis
        ? "browser_analyser"
        : "fallback_progress",
      contract,
      kind: asset.kind,
      reason:
        "R2 media can fall back to safe live analysis only when the client explicitly allows it.",
      supportsLiveAnalysis: Boolean(environment.allowLiveAnalysis),
      usesIframeAudio: false,
    };
  }

  return {
    analysisMode: "fallback_progress",
    contract,
    kind: asset.kind,
    reason:
      "First-party media has no ready peaks yet, so use a lightweight progress visual.",
    supportsLiveAnalysis: false,
    usesIframeAudio: false,
  };
}

function normalizeFirstPartyAsset(
  asset?: FirstPartyWaveformAsset | null,
): FirstPartyWaveformAsset | null {
  if (!asset) {
    return null;
  }

  return {
    ...asset,
    kind: asset.kind === "stream_media" ? "stream_media" : "r2_media",
  };
}

function normalizeWaveformContract(
  input: WaveformMetadataContract,
): Required<WaveformMetadataContract> {
  return {
    waveform_peaks_key:
      input.waveform_peaks_key ?? EMPTY_WAVEFORM_CONTRACT.waveform_peaks_key,
    waveform_peaks_url:
      input.waveform_peaks_url ?? EMPTY_WAVEFORM_CONTRACT.waveform_peaks_url,
    waveform_status:
      input.waveform_status ?? EMPTY_WAVEFORM_CONTRACT.waveform_status,
  };
}

function normalizeWaveformKind(
  sourceType: PlaybackSourceKind | WaveformSourceKind | null | undefined,
): WaveformSourceKind {
  switch (sourceType) {
    case "direct":
    case "direct_media":
      return "direct_media";
    case "hls":
    case "hls_media":
      return "hls_media";
    case "r2_media":
      return "r2_media";
    case "stream_media":
      return "stream_media";
    case "youtube":
    case "youtube_embed":
    default:
      return "youtube_embed";
  }
}
