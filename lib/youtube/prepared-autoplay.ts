import type { YoutubePlayer } from "./iframe-api";
export type PreparedSession = {
  roomId: string;
  activeQueueItemId: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  playbackOccurrenceId?: string | null;
  positionSeconds: number;
  status: string;
  serverUpdatedMs: number;
  serverRevisionMs?: number;
  queueAutoplayEnabled?: boolean;
};
type Intent = {
  queueItemId: string;
  sourceUrl: string;
  commit(position: number, expected: PreparedSession): void;
  fail(message: string): void;
};
type Pending = Intent & {
  previous: PreparedSession;
  baseline: PreparedSession | null;
  phase: "waiting" | "loading" | "publishing";
  started: number;
  stop?(): void;
};
function sameCommand(a: PreparedSession, b: PreparedSession) {
  return (
    a.roomId === b.roomId &&
    a.activeQueueItemId === b.activeQueueItemId &&
    a.sourceUrl === b.sourceUrl &&
    a.playbackOccurrenceId === b.playbackOccurrenceId &&
    a.positionSeconds === b.positionSeconds &&
    a.status === b.status &&
    (a.serverRevisionMs ?? a.serverUpdatedMs) ===
      (b.serverRevisionMs ?? b.serverUpdatedMs)
  );
}
/** Local intent only: joining clients have nothing to acknowledge or rewind. */
export class PreparedYouTubeAutoplay {
  private current: PreparedSession | null = null;
  private pending: Pending | null = null;
  private allowed = false;
  observe(
    session: PreparedSession | null,
    allowed: boolean,
    connected: boolean,
  ) {
    this.current = session;
    this.allowed = allowed && connected;
    const p = this.pending;
    if (!p) return;
    if (!session || !this.allowed || session.queueAutoplayEnabled === false) {
      this.cancel();
      return;
    }
    if (p.baseline) {
      if (!sameCommand(p.baseline, session))
        this.cancel(session.status !== "playing");
      return;
    }
    const promoted =
      session.activeQueueItemId === p.queueItemId &&
      session.sourceUrl === p.sourceUrl &&
      (session.playbackOccurrenceId !== p.previous.playbackOccurrenceId ||
        session.activeQueueItemId !== p.previous.activeQueueItemId);
    if (promoted) {
      if (
        session.status === "paused" &&
        session.positionSeconds === 0 &&
        session.sourceType === "youtube"
      )
        p.baseline = { ...session };
      else this.cancel();
    } else if (!sameCommand(p.previous, session)) this.cancel();
  }
  arm(intent: Intent) {
    this.cancel();
    if (!this.current || !this.allowed) return;
    this.pending = {
      ...intent,
      previous: { ...this.current },
      baseline: null,
      phase: "waiting",
      started: Date.now(),
    };
  }
  cancel(stop = true) {
    const pending = this.pending;
    this.pending = null;
    if (stop) {
      try {
        pending?.stop?.();
      } catch {
        /* Source teardown may already have destroyed the iframe. */
      }
    }
  }
  apply(
    player: Pick<YoutubePlayer, "loadVideoById" | "playVideo"> &
      Partial<Pick<YoutubePlayer, "pauseVideo">>,
    session: PreparedSession,
    now = Date.now(),
    videoId = "",
  ) {
    const p = this.pending;
    if (p && !p.baseline && now - p.started > 15000) {
      this.cancel();
      p.fail("The next song could not be prepared. Try playing it again.");
      return false;
    }
    if (!p || !p.baseline || !this.allowed || !sameCommand(p.baseline, session))
      return false;
    if (p.phase === "waiting") {
      if (!videoId) return true;
      p.stop = () => player.pauseVideo?.();
      p.phase = "loading";
      p.started = now;
      player.loadVideoById(videoId, 0);
      player.playVideo();
    }
    if (now - p.started > 15000) {
      this.cancel();
      p.fail("YouTube could not start yet. Press play to try again.");
      return false;
    }
    return true;
  }
  ready(player: Pick<YoutubePlayer, "getCurrentTime">) {
    const p = this.pending;
    if (
      !p ||
      p.phase !== "loading" ||
      !p.baseline ||
      !this.current ||
      !this.allowed ||
      !sameCommand(p.baseline, this.current)
    )
      return;
    const position = player.getCurrentTime();
    if (!Number.isFinite(position) || position < 0 || position > 2) return;
    p.phase = "publishing";
    p.commit(position, p.baseline);
  }
}
