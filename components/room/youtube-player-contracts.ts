import type { PlaybackMode } from "@/lib/player/types";
import type { LiveRoomState } from "@/lib/spacetime";
export type YoutubeMediaPlayerProps = {
  className?: string;
  liveRoom: LiveRoomState;
  mode: PlaybackMode;
  showNativeControls?: boolean;
};
