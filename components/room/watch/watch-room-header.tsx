"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import {
  ArrowLeft,
  ListVideo,
  MoreHorizontal,
  Plus,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui";
import { WatchLeaveButton } from "./watch-leave-button";
import { WatchRoomName } from "./watch-room-name";
import {
  ListenRoomSaveButton,
  ListenMemberAvatarRow,
} from "../listen/header/header-participant-tools";
import { ModeSwitcher } from "../mode-switcher";
import { InviteActions } from "../invite-actions";
import type { WatchModeLayoutProps } from "./contracts";
import type { WatchWorkspace } from "./watch-navigation";

export function WatchRoomHeader({
  room,
  liveRoom,
  navigate,
  themeStyle,
}: Pick<WatchModeLayoutProps, "account" | "room" | "liveRoom"> & {
  navigate(screen: WatchWorkspace): void;
  themeStyle: CSSProperties;
}) {
  const inviteRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (
        inviteRef.current &&
        !inviteRef.current.contains(event.target as Node)
      )
        inviteRef.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const connected = liveRoom.connectionStatus === "connected";
  return (
    <header className="watch-room-header">
      <WatchLeaveButton className="watch-icon-button">
        <ArrowLeft />
      </WatchLeaveButton>
      {/* eslint-disable-next-line @next/next/no-img-element -- Established local brand lockup. */}
      <img
        className="watch-brand"
        src="/brand/navbar-logo-mistake-watch-signal-aperture-transparent.png"
        alt="Mistake Watch"
      />
      <div className="watch-room-identity">
        <div className="watch-room-title-row">
          <WatchRoomName
            name={liveRoom.snapshot.session?.roomName ?? room.name}
            liveRoom={liveRoom}
          />
          <ListenRoomSaveButton
            canSave={liveRoom.canManageAuthority}
            initialSaved={room.isSaved}
            key={`${room.id}:${room.isSaved}`}
            roomId={room.id}
          />
        </div>
        <span>
          <i data-connected={connected} />
          {connected ? "Connected" : liveRoom.connectionStatus} ·{" "}
          {liveRoom.participants.filter((p) => p.status === "online").length} in
          room
        </span>
      </div>
      <div className="watch-header-audience">
        <ListenMemberAvatarRow
          controllerMemberId={
            liveRoom.participants.find((p) => p.isController)?.id ?? null
          }
          currentMemberId={room.currentMember?.id}
          liveRoom={liveRoom}
          participants={liveRoom.participants}
          maxVisibleParticipants={1}
          themeStyle={
            {
              ...themeStyle,
              "--color-primary-fixed-dim": "rgb(var(--listen-primary))",
              "--color-primary": "rgb(var(--listen-primary))",
              "--color-primary-container": "rgb(var(--listen-primary))",
            } as CSSProperties
          }
        />
      </div>
      <div className="watch-desktop-mode">
        <ModeSwitcher
          mode={room.mode}
          compact
          canSwitch={liveRoom.canManageAuthority && connected}
          onSwitchMode={liveRoom.switchMode}
        />
      </div>
      <nav className="watch-desktop-actions" aria-label="Room tools">
        <button className="watch-add-button" onClick={() => navigate("add")}>
          <Plus />
          Add media
        </button>
        <button onClick={() => navigate("queue")}>
          <ListVideo />
          Queue
        </button>
        <button onClick={() => navigate("social")}>
          <Users />
          Social
        </button>
        <details
          className="watch-invite-menu"
          ref={inviteRef}
          onKeyDown={(event) => {
            if (event.key === "Escape" && inviteRef.current) {
              event.stopPropagation();
              inviteRef.current.open = false;
              inviteRef.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>Invite</summary>
          <div>
            <InviteActions inviteUrl={room.inviteUrl} roomCode={room.code} />
          </div>
        </details>
      </nav>
      <button
        className="watch-account-button"
        aria-label="Room and account settings"
        onClick={() => navigate("more")}
      >
        {room.currentMember ? (
          <Avatar
            name={room.currentMember.name}
            seed={room.currentMember.id}
            avatarKey={room.currentMember.avatarKey}
            crowned={room.currentMember.id === room.hostMemberId}
            className="h-9 w-9"
          />
        ) : (
          <MoreHorizontal />
        )}
      </button>
    </header>
  );
}
