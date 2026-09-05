"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RoomSnapshot } from "@/lib/rooms";

import { PreparedYouTubeAutoplay } from "@/lib/youtube/prepared-autoplay";
import type { LiveRoomState } from "@/lib/spacetime";
import { WatchModeLayout } from "@/components/room/watch/watch-mode-layout";

import { previewArtwork, previewCatalogue } from "./watch-preview-data";
const id = "00000000-0000-4000-8000-000000000001";
const member = {
  id: "host",
  name: "Jayden",
  role: "host" as const,
  avatarKey: "processor",
};
const participant = {
  ...member,
  status: "online" as const,
  isController: true,
  permissions: {
    queue: true,
    manageQueue: true,
    playback: true,
    browser: false,
  },
};
const room: RoomSnapshot = {
  id,
  code: "WATCH-QA",
  name: "Friday Night",
  mode: "watch",
  host: "Jayden",
  hostMemberId: "host",
  currentMember: member,
  participants: 2,
  isAttachedToAccount: false,
  isSaved: false,
  queue: [],
  participantsList: [participant],
  nowPlaying: {
    title: "Afterlight",
    source: "Direct video",
    elapsed: "0:00",
    duration: "1:00",
    resolution: "",
    latency: "",
    sync: "connected",
  },
};
const names = [
  "Afterlight",
  "The Long Way Home",
  "Into the Canopy",
  "Building Other Worlds",
];
const queue = names.map((title, index) => ({
  queueItemId: "queue-" + index,
  roomId: id,
  title,
  artist: "Room library",
  position: index,
  sourceType: "direct",
  sourceUrl: "/dev/watch-fixture.webm",
  thumbnailUrl: previewArtwork(index),
  durationSeconds: 60,
  isPinned: false,
  isPlayNext: false,
  isUnavailable: false,
  status: index ? "queued" : "playing",
  addedByMemberId: "host",
  playedSequence: 0,
  failureCount: 0,
  failureCode: null,
  failureReason: null,
  failureCreatedMs: null,
  playlistId: null,
  playlistTitle: null,
  channelName: null,
}));

declare global {
  interface Window {
    watchQA?: {
      autoplayYouTube(sourceUrl: string): void;
      calls: Array<{ action: string; input: unknown }>;
      setPermission: (allowed: boolean) => void;
      setRoomName: (name: string) => void;
      setRenameFailure: (fail: boolean) => void;
      setSaveFailure: (fail: boolean) => void;
      setParticipants: (members: LiveRoomState["participants"]) => void;
      setArtwork: (artwork: string | null) => void;
      setConnected: (connected: boolean) => void;
      setPosition: (positionSeconds: number) => void;
      setPlaybackPermission: (allowed: boolean) => void;
      setSource: (sourceUrl: string, sourceType: "direct" | "youtube") => void;
    };
  }
}

export function WatchDesignFixture() {
  const [youtubeAutoplayPreparation] = useState(
    () => new PreparedYouTubeAutoplay(),
  );
  const [queueState, setQueueState] = useState(queue);
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const calls = useRef<Array<{ action: string; input: unknown }>>([]);
  const [activeArtwork, setArtwork] = useState<string | null>(
    previewArtwork(0),
  );
  const [allowed, setAllowed] = useState(true);
  const [playbackAllowed, setPlaybackAllowed] = useState(true);
  const renameFailure = useRef(false);
  const saveFailure = useRef(false);
  const [participants, setParticipants] = useState<
    LiveRoomState["participants"]
  >([
    participant,
    {
      ...participant,
      id: "returning-friend",
      name: "Alex",
      role: "guest",
      status: "idle",
      isController: false,
    },
  ]);
  const [connected, setConnected] = useState(true);
  const [session, setSession] = useState({
    roomId: id,
    supabaseRoomId: id,
    mode: "watch",
    status: "paused",
    positionSeconds: 0,
    playbackRate: 1,
    playbackOccurrenceId: "fixture",
    queueAutoplayEnabled: false,
    queueMode: "normal",
    serverUpdatedMs: 0,
    roomName: room.name,
    sourceTitle: names[0],
    sourceType: "direct",
    sourceUrl: "/dev/watch-fixture.webm",
    sourceDurationSeconds: 60,
    hostMemberId: "host",
    controllerIdentity: null,
    activeQueueItemId: "queue-0",
  });
  useLayoutEffect(
    () =>
      youtubeAutoplayPreparation.observe(
        session,
        allowed && playbackAllowed,
        connected,
      ),
    [youtubeAutoplayPreparation, session, allowed, playbackAllowed, connected],
  );
  const record = (action: string, input?: unknown) => {
    calls.current.push({ action, input });
  };
  const liveRoom = {
    youtubeAutoplayPreparation,
    snapshot: {
      session,
      queue: queueState.map((item, index) =>
        index ? item : { ...item, thumbnailUrl: activeArtwork },
      ),
      participants: [],
      participantPresences: [],
      permissions: [],
      chatMessages: [],
      errors: [],
      kicks: [],
      rhythmProfiles: [],
    },
    participants,
    canManageAuthority: allowed,
    canAddQueue: allowed,
    canManageQueue: allowed,
    canControlPlayback: allowed && playbackAllowed,
    connectionStatus: connected ? "connected" : "disconnected",
    connectionReadiness: { status: "ready" },
    errorMessage: null,
    removalNotice: null,
    setPlaybackState: (input: { status: string; positionSeconds: number }) => {
      record("playback", input);
      setSession((current) => ({
        ...current,
        ...input,
        serverUpdatedMs: Date.now(),
      }));
    },
    loadMediaSource: (input: {
      sourceUrl: string;
      sourceTitle: string;
      sourceType: string;
    }) => {
      record("load", input);
      setSession((current) => ({ ...current, ...input }));
    },
    addQueueItem: (input: unknown) => record("add", input),
    playQueueItemNow: (input: unknown) => record("playQueue", input),
    playQueueItem: (input: unknown) => record("playQueue", input),
    setQueueItemPriority: (id: string, priority: unknown) =>
      record("priority", { id, priority }),
    moveQueueItem: (id: string, position: number) => {
      record("move", { id, position });
      setQueueState((current) => {
        const upcoming = current
          .filter((i) => i.status === "queued")
          .sort((a, b) => a.position - b.position);
        const moving = upcoming.find((i) => i.queueItemId === id);
        if (!moving) return current;
        const ordered = upcoming.filter((i) => i !== moving);
        ordered.splice(position, 0, moving);
        return current.map((i) =>
          i.status === "queued"
            ? {
                ...i,
                position: ordered.findIndex(
                  (q) => q.queueItemId === i.queueItemId,
                ),
              }
            : i,
        );
      });
    },
    removeQueueItem: (input: unknown) => record("remove", input),
    clearQueue: () => record("clear"),
    setQueueMode: () => {},
    setQueueAutoplay: () => {},
    advanceToNextQueueItem: () => record("advance"),
    reportMediaFailure: () => {},
    updateMediaTitle: () => {},
    switchMode: async () => {},
    renameRoom: async (roomName: string) => {
      record("rename", roomName);
      if (renameFailure.current)
        throw new Error("Room name could not be saved. Try again.");
      setSession((current) => ({ ...current, roomName }));
    },
    retryConnection: () => {},
    grantControl: () => {},
    revokeControl: () => {},
    kickMember: () => {},
    removeIdleMember: (memberId: string) => {
      record("removeIdle", memberId);
      setParticipants((current) =>
        current.filter((member) => member.id !== memberId),
      );
    },
    setPermission: () => {},
    sendChatMessage: async () => {},
    clearRoomRhythmProfile: () => {},
    publishRoomRhythmProfile: () => {},
  } as unknown as LiveRoomState;
  useEffect(() => {
    const originalFetch = window.fetch;
    const useNetwork = new URLSearchParams(location.search).has("network");
    if (!useNetwork)
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        // Simulate only the dev fixture's save-room Server Action response.
        if (
          new Headers(init?.headers).has("Next-Action") &&
          typeof init?.body === "string"
        ) {
          const [args] = JSON.parse(init.body);
          if (args?.roomId === id && typeof args.saved === "boolean") {
            record("saveRoom", args);
            if (saveFailure.current)
              throw new Error("Saved-room update failed.");
            const result = `1:${JSON.stringify({ isSaved: args.saved })}\n`;
            return new Response(
              '0:{"a":"$@1","f":"","b":"development"}\n' + result,
              { headers: { "Content-Type": "text/x-component" } },
            );
          }
        }
        if (url.startsWith("/api/media/assets"))
          return Response.json(previewCatalogue());
        if (url.startsWith("/api/recommendations/preferences"))
          return Response.json({ items: [] });
        if (url.startsWith("/api/"))
          return Response.json(
            {
              error:
                "This is a local design preview. Connected account and provider operations require a real room.",
            },
            { status: 403 },
          );
        return originalFetch(input, init);
      };
    const frame = requestAnimationFrame(() => {
      setOwner(new URLSearchParams(location.search).has("owner"));
      setReady(true);
    });
    window.watchQA = {
      calls: calls.current,
      setPermission: setAllowed,
      setRoomName: (roomName) =>
        setSession((current) => ({ ...current, roomName })),
      setRenameFailure: (fail) => {
        renameFailure.current = fail;
      },
      setSaveFailure: (fail) => {
        saveFailure.current = fail;
      },
      setParticipants,
      setArtwork,
      setConnected,
      setPlaybackPermission: setPlaybackAllowed,
      setPosition: (positionSeconds) =>
        setSession((current) => ({ ...current, positionSeconds })),
      autoplayYouTube: (sourceUrl) => {
        youtubeAutoplayPreparation.arm({
          queueItemId: "queue-1",
          sourceUrl,
          commit: (positionSeconds) => {
            record("playback", { positionSeconds, status: "playing" });
            setSession((current) => ({
              ...current,
              status: "playing",
              positionSeconds,
              serverUpdatedMs: Date.now(),
            }));
          },
          fail: (message) => record("startupError", message),
        });
        setSession((current) => ({
          ...current,
          sourceUrl,
          sourceType: "youtube",
          activeQueueItemId: "queue-1",
          playbackOccurrenceId: "autoplay-next",
          queueAutoplayEnabled: true,
          positionSeconds: 0,
          status: "paused",
          serverUpdatedMs: Date.now(),
        }));
      },
      setSource: (sourceUrl, sourceType) =>
        setSession((current) => ({ ...current, sourceUrl, sourceType })),
    };
    return () => {
      cancelAnimationFrame(frame);
      window.fetch = originalFetch;
      delete window.watchQA;
    };
  }, [youtubeAutoplayPreparation]);
  return ready ? (
    // Match RoomExperience's dynamic layout boundary, including cold subpanels.
    <Suspense fallback={<p>Loading room</p>}>
      <WatchModeLayout
        account={
          owner
            ? {
                status: "signed-in",
                role: "owner",
                accountStatus: "active",
                id,
                displayName: "Jayden",
                email: null,
                avatarKey: "processor",
                avatarSource: "guest_avatar",
                avatarUrl: null,
                googleAvatarUrl: null,
                handle: null,
              }
            : { status: "guest" }
        }
        liveRoom={liveRoom}
        room={room}
        stageRef={stageRef}
      />
    </Suspense>
  ) : (
    <p>Loading local Watch preview…</p>
  );
}
