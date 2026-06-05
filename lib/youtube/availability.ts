export type YouTubeAvailabilityStatus =
  | "embed-blocked"
  | "player-error"
  | "playable"
  | "provider-unavailable"
  | "removed-private"
  | "restricted"
  | "unknown";

export type YouTubeAvailability = {
  playable: boolean;
  reason: string;
  source: "metadata" | "playlist" | "runtime" | "unknown";
  status: YouTubeAvailabilityStatus;
  errorCode?: number;
};

export const PLAYABLE_YOUTUBE_AVAILABILITY: YouTubeAvailability = {
  playable: true,
  reason: "Playable YouTube item.",
  source: "metadata",
  status: "playable",
};

export const UNKNOWN_YOUTUBE_AVAILABILITY: YouTubeAvailability = {
  playable: true,
  reason: "Availability could not be confirmed before playback.",
  source: "unknown",
  status: "unknown",
};

export function classifyYouTubeVideoStatus(input: {
  embeddable?: boolean;
  privacyStatus?: string;
  uploadStatus?: string;
}): YouTubeAvailability {
  if (input.privacyStatus === "private") {
    return {
      playable: false,
      reason: "This video is private or no longer public.",
      source: "metadata",
      status: "removed-private",
    };
  }

  if (input.embeddable === false) {
    return {
      playable: false,
      reason: "The owner does not allow this video to play in embedded players.",
      source: "metadata",
      status: "embed-blocked",
    };
  }

  if (
    input.uploadStatus &&
    input.uploadStatus !== "processed" &&
    input.uploadStatus !== "uploaded"
  ) {
    return {
      playable: false,
      reason: "This video is not currently playable on YouTube.",
      source: "metadata",
      status: "restricted",
    };
  }

  return PLAYABLE_YOUTUBE_AVAILABILITY;
}

export function classifyYouTubePlaylistItemStatus(input: {
  privacyStatus?: string;
  title?: string | null;
  videoId?: string | null;
}): YouTubeAvailability {
  const title = input.title?.trim();

  if (!input.videoId || !title) {
    return {
      playable: false,
      reason: "Playlist item is missing a playable YouTube video.",
      source: "playlist",
      status: "removed-private",
    };
  }

  if (
    title === "Deleted video" ||
    title === "Private video" ||
    input.privacyStatus === "private"
  ) {
    return {
      playable: false,
      reason: "This playlist item is private or deleted.",
      source: "playlist",
      status: "removed-private",
    };
  }

  return {
    ...UNKNOWN_YOUTUBE_AVAILABILITY,
    source: "playlist",
  };
}

export function classifyYouTubeIframeError(
  errorCode: number | undefined,
): YouTubeAvailability {
  switch (errorCode) {
    case 2:
      return {
        errorCode,
        playable: false,
        reason: "YouTube rejected this video id or player parameter.",
        source: "runtime",
        status: "removed-private",
      };
    case 5:
      return {
        errorCode,
        playable: false,
        reason:
          "YouTube could not play this content in the HTML5 embedded player.",
        source: "runtime",
        status: "player-error",
      };
    case 100:
      return {
        errorCode,
        playable: false,
        reason: "This YouTube video was removed, unavailable, or made private.",
        source: "runtime",
        status: "removed-private",
      };
    case 101:
    case 150:
      return {
        errorCode,
        playable: false,
        reason: "The owner does not allow this video to play embedded here.",
        source: "runtime",
        status: "embed-blocked",
      };
    case 153:
      return {
        errorCode,
        playable: false,
        reason:
          "YouTube rejected this embedded playback request because client identity was missing.",
        source: "runtime",
        status: "provider-unavailable",
      };
    default:
      return {
        errorCode,
        playable: false,
        reason: "YouTube could not play this video here.",
        source: "runtime",
        status: "unknown",
      };
  }
}

export function getYouTubeAvailabilityLabel(
  availability?: YouTubeAvailability | null,
) {
  switch (availability?.status) {
    case "embed-blocked":
      return "Embed blocked";
    case "player-error":
      return "Player blocked";
    case "provider-unavailable":
      return "Provider issue";
    case "removed-private":
      return "Unavailable";
    case "restricted":
      return "Restricted";
    case "unknown":
      return "Needs check";
    case "playable":
    default:
      return "Playable";
  }
}
