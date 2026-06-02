import type { PlaybackSourceKind } from "./types";

const HLS_EXTENSIONS = [".m3u8"];
const AUDIO_MEDIA_EXTENSIONS = [
  ".aac",
  ".flac",
  ".m4a",
  ".mp3",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
];
const VIDEO_MEDIA_EXTENSIONS = [".m4v", ".mov", ".mp4", ".webm"];
const DIRECT_MEDIA_EXTENSIONS = [
  ...new Set([...AUDIO_MEDIA_EXTENSIONS, ...VIDEO_MEDIA_EXTENSIONS]),
];

export type SourceValidationResult =
  | {
      kind: PlaybackSourceKind;
      title: string;
      url: string;
      valid: true;
    }
  | {
      message: string;
      valid: false;
    };

export type ParsedYouTubePlaylist = {
  playlistId: string;
  videoId: string | null;
};

export function detectUrlType(
  input: string,
): "direct" | "empty" | "hls" | "invalid" | "youtube" | "youtube-playlist" {
  const trimmed = input.trim();

  if (!trimmed) {
    return "empty";
  }

  if (parseYouTubePlaylist(trimmed)) {
    return "youtube-playlist";
  }

  if (parseYouTubeVideoId(trimmed)) {
    return "youtube";
  }

  try {
    const parsed = new URL(trimmed);
    const extension = inferExtension(parsed);

    if (HLS_EXTENSIONS.includes(extension)) {
      return "hls";
    }

    if (DIRECT_MEDIA_EXTENSIONS.includes(extension)) {
      return "direct";
    }
  } catch {
    return "invalid";
  }

  return "invalid";
}

export function validateDirectMediaSource(
  input: string,
): SourceValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      message: "Enter a direct media URL first.",
      valid: false,
    };
  }

  const youtubeVideoId = parseYouTubeVideoId(trimmed);

  if (youtubeVideoId) {
    return {
      kind: "youtube",
      title: "YouTube video",
      url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
      valid: true,
    };
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      message: "Use a full http or https media URL.",
      valid: false,
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      message: "Only http and https media URLs are supported right now.",
      valid: false,
    };
  }

  const extension = inferExtension(parsed);
  const kind = HLS_EXTENSIONS.includes(extension) ? "hls" : "direct";

  if (kind === "direct" && !DIRECT_MEDIA_EXTENSIONS.includes(extension)) {
    return {
      message:
        "That URL does not look like a direct audio/video file or HLS stream.",
      valid: false,
    };
  }

  return {
    kind,
    title: decodeURIComponent(parsed.pathname.split("/").at(-1) ?? "Media"),
    url: parsed.toString(),
    valid: true,
  };
}

export function validateMediaSourceForMode(
  input: string,
  mode: "listen" | "watch",
): SourceValidationResult {
  const result = validateDirectMediaSource(input);

  if (!result.valid || mode === "watch") {
    return result;
  }

  if (result.kind === "direct" && !isLikelyAudioUrl(result.url)) {
    return {
      message:
        "Listen rooms need a direct audio URL, HLS stream, YouTube link, or YouTube Music link.",
      valid: false,
    };
  }

  return result;
}

export function parseYouTubeVideoId(input: string) {
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    return normalizeYouTubeId(parsed.pathname.split("/").filter(Boolean)[0]);
  }

  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (parsed.pathname === "/watch") {
      return normalizeYouTubeId(parsed.searchParams.get("v"));
    }

    const [prefix, id] = parsed.pathname.split("/").filter(Boolean);

    if (prefix === "embed" || prefix === "shorts" || prefix === "live") {
      return normalizeYouTubeId(id);
    }
  }

  return null;
}

export function parseYouTubePlaylist(
  input: string,
): ParsedYouTubePlaylist | null {
  const trimmed = input.trim();

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (
    host !== "youtube.com" &&
    host !== "m.youtube.com" &&
    host !== "music.youtube.com" &&
    host !== "youtu.be"
  ) {
    return null;
  }

  const playlistId = normalizeYouTubePlaylistId(
    parsed.searchParams.get("list"),
  );

  if (!playlistId) {
    return null;
  }

  return {
    playlistId,
    videoId: parseYouTubeVideoId(trimmed),
  };
}

export function getYouTubeThumbnailUrl(input: string) {
  const videoId = parseYouTubeVideoId(input);

  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

export function getSourceDisplayTitle({
  sourceType,
  sourceUrl,
  title,
}: {
  sourceType: PlaybackSourceKind;
  sourceUrl: string;
  title?: string | null;
}) {
  const trimmedTitle = title?.trim();

  if (
    trimmedTitle &&
    trimmedTitle !== sourceUrl &&
    !/^YouTube [a-zA-Z0-9_-]{11}$/.test(trimmedTitle)
  ) {
    return trimmedTitle;
  }

  if (sourceType === "youtube") {
    return "YouTube video";
  }

  try {
    const parsed = new URL(sourceUrl);
    const fileName = decodeURIComponent(
      parsed.pathname.split("/").filter(Boolean).at(-1) ?? "",
    );

    return fileName || sourceUrl;
  } catch {
    return sourceUrl;
  }
}

function normalizeYouTubeId(value: string | null | undefined) {
  return value && /^[a-zA-Z0-9_-]{11}$/.test(value) ? value : null;
}

function normalizeYouTubePlaylistId(value: string | null | undefined) {
  return value && /^[a-zA-Z0-9_-]{8,80}$/.test(value) ? value : null;
}

function inferExtension(url: URL) {
  const pathname = url.pathname.toLowerCase();
  const extension = pathname.match(/\.[a-z0-9]+$/)?.[0];

  return extension ?? "";
}

function isLikelyAudioUrl(input: string) {
  try {
    return AUDIO_MEDIA_EXTENSIONS.includes(inferExtension(new URL(input)));
  } catch {
    return false;
  }
}
