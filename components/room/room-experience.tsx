"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { RoomLoadingFallback } from "@/components/ui/room-loading/fallback";
import { useRoomTransitions } from "@/components/ui/room-loading/provider";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import { PLAYER_FULLSCREEN_EVENT } from "@/lib/player/local-controls";
import { useLiveRoom, type LiveRoomState } from "@/lib/spacetime";
import { getRoomConnectionPresentation } from "@/lib/spacetime/live-room/connection-readiness";

const ListenModeLayout = dynamic(
  () =>
    import("./listen/listen-mode-layout").then(
      (module) => module.ListenModeLayout,
    ),
  { loading: RoomModeLoadingBoundary },
);
const WatchModeLayout = dynamic(
  () =>
    import("./watch/watch-mode-layout").then(
      (module) => module.WatchModeLayout,
    ),
  { loading: RoomModeLoadingBoundary },
);

type RoomExperienceProps = {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  room: RoomSnapshot;
};

export function RoomExperience({
  account,
  accountNotice,
  room,
}: RoomExperienceProps) {
  const router = useRouter();
  const liveRoom = useLiveRoom(room);
  const transitions = useRoomTransitions();
  const retryRef = useRef(liveRoom.retryConnection);
  useLayoutEffect(() => {
    retryRef.current = liveRoom.retryConnection;
  }, [liveRoom.retryConnection]);
  const retry = useMemo(() => () => retryRef.current(), []);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const liveMode =
    liveRoom.snapshot.session?.mode === "listen" ? "listen" : "watch";
  const liveRoomSnapshot = useMemo<RoomSnapshot>(
    () => ({
      ...room,
      mode: liveMode,
    }),
    [liveMode, room],
  );
  const presentation =
    liveRoom.presentationReadiness?.roomId === room.id
      ? liveRoom.presentationReadiness
      : undefined;
  const blocked = !!liveRoom.removalNotice;
  const presentationError =
    liveRoom.connectionReadiness.status === "error"
      ? liveRoom.connectionReadiness.message
      : null;
  useLayoutEffect(() => {
    if (blocked) {
      transitions?.cancel();
      return;
    }
    transitions?.observe({
      roomId: room.id,
      epoch: presentation?.epoch ?? 0,
      ready: presentation?.ready ?? false,
      mode: presentation?.mode ?? (room.mode as "watch" | "listen"),
      error: presentationError,
      retry,
    });
  }, [
    transitions,
    room.id,
    room.mode,
    presentation?.epoch,
    presentation?.ready,
    presentation?.mode,
    presentationError,
    blocked,
    retry,
  ]);
  useEffect(() => () => transitions?.leave(room.id), [transitions, room.id]);
  useEffect(() => {
    // Watch owns the complete player and its fullscreen transport overlay.
    if (liveMode === "watch") return;
    function handleFullscreen() {
      const stage = stageRef.current;

      if (!stage) {
        return;
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }

      void stage.requestFullscreen();
    }

    window.addEventListener(PLAYER_FULLSCREEN_EVENT, handleFullscreen);

    return () =>
      window.removeEventListener(PLAYER_FULLSCREEN_EVENT, handleFullscreen);
  }, [liveMode]);

  useEffect(() => {
    if (accountNotice === "guest-room-attached") {
      router.replace(`/rooms/${room.id}`, { scroll: false });
    }
  }, [accountNotice, room.id, router]);

  useEffect(() => {
    if (
      !liveRoom.removalNotice ||
      liveRoom.removalReason === "admission-failed"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace("/?notice=removed-from-room");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [liveRoom.removalNotice, liveRoom.removalReason, router]);

  if (liveRoom.removalNotice) {
    if (liveRoom.removalReason === "admission-failed") {
      return (
        <RoomConnectionBoundary
          readiness={{ status: "error", message: liveRoom.removalNotice }}
          retry={liveRoom.retryConnection}
        />
      );
    }
    return <RoomRemovedNotice message={liveRoom.removalNotice} />;
  }

  if (liveRoom.connectionReadiness.status !== "ready") {
    return (
      <RoomConnectionBoundary
        readiness={liveRoom.connectionReadiness}
        retry={liveRoom.retryConnection}
      />
    );
  }

  if (liveRoomSnapshot.mode === "listen") {
    return (
      <ListenModeLayout
        account={account}
        accountNotice={accountNotice}
        liveRoom={liveRoom}
        room={liveRoomSnapshot}
      />
    );
  }

  return (
    <WatchModeLayout
      account={account}
      accountNotice={accountNotice}
      liveRoom={liveRoom}
      room={liveRoomSnapshot}
      stageRef={stageRef}
    />
  );
}

function RoomConnectionBoundary({
  readiness,
  retry,
}: {
  readiness: Exclude<LiveRoomState["connectionReadiness"], { status: "ready" }>;
  retry(): void;
}) {
  const presentation = getRoomConnectionPresentation(readiness);
  return (
    <RoomLoadingFallback
      label={presentation.label}
      detail={presentation.detail}
      error={presentation.canRetry ? presentation.detail : undefined}
      retry={presentation.canRetry ? retry : undefined}
    />
  );
}

function RoomRemovedNotice({ message }: { message: string }) {
  const router = useRouter();
  return (
    <main className="grid min-h-screen place-items-center bg-background px-margin-mobile text-on-surface">
      <section
        aria-live="assertive"
        className="grid w-full max-w-md gap-4 rounded-lg border border-error/35 bg-surface/95 p-6 text-center shadow-[0_0_36px_rgb(255_180_171_/_0.12)]"
        role="alert"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-error/35 bg-error/10 text-error">
          <ShieldX className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="technical-label text-error">Room access ended</p>
          <h1 className="mt-2 text-headline-md font-semibold text-on-surface">
            You were removed from the room
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {message} You will be returned to the dashboard.
          </p>
        </div>
        <Button
          className="mx-auto"
          onClick={() => {
            router.replace("/?notice=removed-from-room");
          }}
          type="button"
          variant="secondary"
        >
          Back to dashboard
        </Button>
      </section>
    </main>
  );
}

function RoomModeLoadingBoundary() {
  return <RoomLoadingFallback />;
}
