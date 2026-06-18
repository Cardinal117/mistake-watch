export type MediaProcessingStrategy =
  | "convert"
  | "direct_ready"
  | "failed"
  | "needs_approval";

export type ClientMediaInspection = {
  audioCodecs?: string[];
  container?: string | null;
  isBrowserSafe?: boolean;
  notes?: string[];
  videoCodecs?: string[];
};

export type MediaProcessingDecisionInput = {
  clientInspection?: ClientMediaInspection | null;
  durationSeconds?: number | null;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export type MediaProcessingDecision = {
  estimatedCredits: number | null;
  inspectionResult: {
    audioCodecs: string[];
    clientBrowserSafe: boolean | null;
    container: string | null;
    durationSeconds: number | null;
    fileExtension: string;
    fileSizeBytes: number;
    mimeType: string;
    notes: string[];
    videoCodecs: string[];
  };
  reason: string;
  requiresApproval: boolean;
  strategy: MediaProcessingStrategy;
};

const approvalDurationSeconds = 60 * 60;
const approvalFileSizeBytes = 1.5 * 1024 * 1024 * 1024;

export function decideMediaProcessing(
  input: MediaProcessingDecisionInput,
): MediaProcessingDecision {
  const fileExtension = readFileExtension(input.fileName);
  const normalizedMimeType = input.mimeType.toLowerCase();
  const durationSeconds = normalizeDuration(input.durationSeconds);
  const clientInspection = normalizeClientInspection(input.clientInspection);
  const notes = [...clientInspection.notes];
  const estimatedCredits = estimateCloudConvertCredits(durationSeconds);
  const likelyMp4 =
    fileExtension === "mp4" ||
    fileExtension === "m4v" ||
    normalizedMimeType === "video/mp4" ||
    normalizedMimeType === "video/x-m4v";
  const largeOrLong =
    input.fileSizeBytes >= approvalFileSizeBytes ||
    (durationSeconds !== null && durationSeconds >= approvalDurationSeconds) ||
    (durationSeconds === null && input.fileSizeBytes >= approvalFileSizeBytes);

  if (
    likelyMp4 &&
    clientInspection.isBrowserSafe === true &&
    hasCodec(clientInspection.videoCodecs, "avc1") &&
    hasCodec(clientInspection.audioCodecs, "mp4a") &&
    !hasUnsafeCodec(clientInspection.videoCodecs) &&
    !hasUnsafeCodec(clientInspection.audioCodecs)
  ) {
    notes.push("Client MP4 preflight found H.264 video and AAC audio.");

    return {
      estimatedCredits,
      inspectionResult: {
        audioCodecs: clientInspection.audioCodecs,
        clientBrowserSafe: true,
        container: clientInspection.container ?? "mp4",
        durationSeconds,
        fileExtension,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        notes,
        videoCodecs: clientInspection.videoCodecs,
      },
      reason: "Already browser-playable MP4.",
      requiresApproval: false,
      strategy: "direct_ready",
    };
  }

  if (likelyMp4 && clientInspection.isBrowserSafe !== true) {
    notes.push(
      "MP4 upload was not confidently identified as H.264/AAC, so processing is required.",
    );
  }

  if (!likelyMp4) {
    notes.push("Non-MP4 container requires browser-safe MP4 conversion.");
  }

  if (largeOrLong) {
    return {
      estimatedCredits,
      inspectionResult: {
        audioCodecs: clientInspection.audioCodecs,
        clientBrowserSafe: clientInspection.isBrowserSafe,
        container: clientInspection.container,
        durationSeconds,
        fileExtension,
        fileSizeBytes: input.fileSizeBytes,
        mimeType: input.mimeType,
        notes,
        videoCodecs: clientInspection.videoCodecs,
      },
      reason:
        durationSeconds === null
          ? "Large upload has unknown duration; owner approval is required before spending conversion credits."
          : "Large or long upload may spend significant CloudConvert credits.",
      requiresApproval: true,
      strategy: "needs_approval",
    };
  }

  return {
    estimatedCredits,
    inspectionResult: {
      audioCodecs: clientInspection.audioCodecs,
      clientBrowserSafe: clientInspection.isBrowserSafe,
      container: clientInspection.container,
      durationSeconds,
      fileExtension,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      notes,
      videoCodecs: clientInspection.videoCodecs,
    },
    reason: "Upload needs CloudConvert processing before playback.",
    requiresApproval: false,
    strategy: "convert",
  };
}

export function estimateCloudConvertCredits(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return null;
  }

  return Math.max(1, Math.ceil(durationSeconds / 60));
}

function normalizeClientInspection(
  inspection: ClientMediaInspection | null | undefined,
): Required<ClientMediaInspection> {
  return {
    audioCodecs: normalizeCodecs(inspection?.audioCodecs),
    container:
      typeof inspection?.container === "string" && inspection.container.trim()
        ? inspection.container.trim().toLowerCase()
        : null,
    isBrowserSafe:
      typeof inspection?.isBrowserSafe === "boolean"
        ? inspection.isBrowserSafe
        : false,
    notes: Array.isArray(inspection?.notes)
      ? inspection.notes
          .filter((note): note is string => typeof note === "string")
          .map((note) => note.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [],
    videoCodecs: normalizeCodecs(inspection?.videoCodecs),
  };
}

function normalizeCodecs(codecs: unknown) {
  if (!Array.isArray(codecs)) {
    return [];
  }

  return Array.from(
    new Set(
      codecs
        .filter((codec): codec is string => typeof codec === "string")
        .map((codec) => codec.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function readFileExtension(fileName: string) {
  const extension = fileName.toLowerCase().split(".").pop();

  return extension && extension !== fileName.toLowerCase() ? extension : "";
}

function normalizeDuration(durationSeconds: number | null | undefined) {
  if (
    typeof durationSeconds === "number" &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0
  ) {
    return Math.floor(durationSeconds);
  }

  return null;
}

function hasCodec(codecs: string[], codecPrefix: string) {
  return codecs.some((codec) => codec === codecPrefix || codec.startsWith(codecPrefix));
}

function hasUnsafeCodec(codecs: string[]) {
  return codecs.some((codec) =>
    ["ac-3", "av01", "dts", "ec-3", "flac", "hev1", "hvc1", "opus", "vp09"].some(
      (unsafeCodec) => codec === unsafeCodec || codec.startsWith(unsafeCodec),
    ),
  );
}
