export type MediaSessionArtworkInput = {
  sizes?: string | null;
  sourceKind?: MediaSessionArtworkSourceKind | null;
  src?: string | null;
  type?: string | null;
};

export type MediaSessionArtworkSourceKind = "app" | "youtube";

export type MediaSessionMetadataInput = {
  album?: string | null;
  artist?: string | null;
  artwork?: MediaSessionArtworkInput[] | null;
  title?: string | null;
};

export type MediaSessionPositionInput = {
  duration?: number | null;
  playbackRate?: number | null;
  position?: number | null;
};

export type MediaSessionActionHandlers = Partial<
  Record<MediaSessionAction, MediaSessionActionHandler | null>
>;

export type MediaSessionEnvironment = {
  MediaMetadata?: typeof MediaMetadata;
  navigator?: Pick<Navigator, "mediaSession">;
};

export type NormalizedMediaSessionMetadata = {
  album: string;
  artist: string;
  artwork: MediaImage[];
  title: string;
};

const defaultTitle = "Mistake Watch";
const defaultArtist = "Mistake Watch";
const defaultAlbum = "Mistake Watch";
const trustedAppArtworkPaths = new Set([
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
]);
const trustedYouTubeArtworkHosts = new Set([
  "i.ytimg.com",
  "img.youtube.com",
]);

export function getMediaSessionEnvironment(): MediaSessionEnvironment {
  return {
    MediaMetadata:
      typeof globalThis.MediaMetadata === "function"
        ? globalThis.MediaMetadata
        : undefined,
    navigator:
      typeof globalThis.navigator !== "undefined"
        ? globalThis.navigator
        : undefined,
  };
}

export function canUseMediaSession(
  environment: MediaSessionEnvironment = getMediaSessionEnvironment(),
) {
  return Boolean(environment.navigator?.mediaSession);
}

export function normalizeMediaSessionMetadata(
  input: MediaSessionMetadataInput,
): NormalizedMediaSessionMetadata {
  return {
    album: normalizeText(input.album) ?? defaultAlbum,
    artist: normalizeText(input.artist) ?? defaultArtist,
    artwork: normalizeArtwork(input.artwork),
    title: normalizeText(input.title) ?? defaultTitle,
  };
}

export function publishMediaSessionMetadata(
  input: MediaSessionMetadataInput,
  environment: MediaSessionEnvironment = getMediaSessionEnvironment(),
) {
  const mediaSession = environment.navigator?.mediaSession;
  const MediaMetadataConstructor = environment.MediaMetadata;

  if (!mediaSession || !MediaMetadataConstructor) {
    return false;
  }

  const metadata = normalizeMediaSessionMetadata(input);

  mediaSession.metadata = new MediaMetadataConstructor(metadata);
  return true;
}

export function setMediaSessionPlaybackState(
  playbackState: MediaSessionPlaybackState,
  environment: MediaSessionEnvironment = getMediaSessionEnvironment(),
) {
  const mediaSession = environment.navigator?.mediaSession;

  if (!mediaSession) {
    return false;
  }

  mediaSession.playbackState = playbackState;
  return true;
}

export function setMediaSessionPositionState(
  input: MediaSessionPositionInput,
  environment: MediaSessionEnvironment = getMediaSessionEnvironment(),
) {
  const mediaSession = environment.navigator?.mediaSession;

  if (!mediaSession?.setPositionState) {
    return false;
  }

  const duration = normalizePositiveNumber(input.duration);
  const position = normalizeNonNegativeNumber(input.position);

  if (duration === null || position === null) {
    return false;
  }

  mediaSession.setPositionState({
    duration,
    playbackRate: normalizePositiveNumber(input.playbackRate) ?? 1,
    position: Math.min(position, duration),
  });
  return true;
}

export function bindMediaSessionActionHandlers(
  handlers: MediaSessionActionHandlers,
  environment: MediaSessionEnvironment = getMediaSessionEnvironment(),
) {
  const mediaSession = environment.navigator?.mediaSession;
  const boundActions: MediaSessionAction[] = [];

  if (!mediaSession?.setActionHandler) {
    return () => undefined;
  }

  for (const [action, handler] of Object.entries(handlers) as Array<
    [MediaSessionAction, MediaSessionActionHandler | null | undefined]
  >) {
    try {
      mediaSession.setActionHandler(action, handler ?? null);
      boundActions.push(action);
    } catch {
      // Browsers may expose Media Session while rejecting specific actions.
    }
  }

  return () => {
    for (const action of boundActions) {
      try {
        mediaSession.setActionHandler(action, null);
      } catch {
        // Cleanup should never break room teardown.
      }
    }
  };
}

function normalizeArtwork(
  artwork: MediaSessionArtworkInput[] | null | undefined,
) {
  return (artwork ?? []).reduce<MediaImage[]>((items, item) => {
    const src = normalizeText(item.src);

    if (!src || !isTrustedArtworkSource(src, item.sourceKind)) {
      return items;
    }

    items.push({
      src,
      sizes: normalizeText(item.sizes) ?? undefined,
      type: normalizeText(item.type) ?? undefined,
    });

    return items;
  }, []);
}

function isTrustedArtworkSource(
  src: string,
  sourceKind: MediaSessionArtworkSourceKind | null | undefined,
) {
  if (sourceKind === "app") {
    return trustedAppArtworkPaths.has(src);
  }

  if (sourceKind !== "youtube") {
    return false;
  }

  try {
    const url = new URL(src);

    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      trustedYouTubeArtworkHosts.has(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || null;
}

function normalizePositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function normalizeNonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
