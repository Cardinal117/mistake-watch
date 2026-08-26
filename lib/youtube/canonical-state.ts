import type { CanonicalPlaybackState, PlaybackMode } from "@/lib/player/types";
import type { LiveRoomState } from "@/lib/spacetime";

export function buildYouTubeCanonicalPlaybackState(
  liveRoom: LiveRoomState,
  mode: PlaybackMode,
): CanonicalPlaybackState | null {
  const session = liveRoom.snapshot.session;

  if (!session || !session.sourceUrl || !session.sourceType) {
    return null;
  }

  return {
    activeQueueItemId: session.activeQueueItemId,
    controllerMemberId: null,
    hostMemberId: session.hostMemberId,
    mode,
    playbackRate: 1,
    positionSeconds: session.positionSeconds,
    roomId: session.roomId,
    serverUpdatedAtMs: session.serverUpdatedMs,
    source: {
      kind:
        session.sourceType === "hls" || session.sourceType === "youtube"
          ? session.sourceType
          : "direct",
      title: session.sourceTitle ?? undefined,
      url: session.sourceUrl,
    },
    status: session.status,
  };
}

export function expectedYouTubePositionAt(
  state: CanonicalPlaybackState,
  clientNowMs: number,
) {
  if (state.status !== "playing") {
    return Math.max(0, state.positionSeconds);
  }

  const elapsedSeconds = Math.max(
    0,
    (clientNowMs - state.serverUpdatedAtMs) / 1000,
  );

  return Math.max(
    0,
    state.positionSeconds + elapsedSeconds * state.playbackRate,
  );
}
