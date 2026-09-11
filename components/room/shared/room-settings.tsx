"use client";
import { ListeningLearningSettings } from "../listen/settings/listening-learning-settings";
import {TemporaryRoomNotice} from "./temporary-room-notice";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  DoorOpen,
  Library,
  Palette,
  Settings2,
  Shield,
  UserRound,
  Users,
  Bookmark,
} from "lucide-react";
import { AccountCommandPanel } from "@/components/account";
import { RoomDirectionPanel } from "./room-direction";
import { SharedMembershipPanel } from "./shared-membership-panel";
import { MembersPanel } from "../members-panel";
import { InviteActions } from "../invite-actions";
import { WatchSavedRoomToggle } from "../watch/header/watch-signal-band";
import { WatchLeaveButton } from "../watch/watch-leave-button";
import type { WatchModeLayoutProps } from "../watch/contracts";
import "./room-settings.css";
const categories = [
  ["profile", "Profile", "Your name and avatar", UserRound],
  ["personalization", "Appearance", "Themes and personalization", Palette],
  ["room", "Room", "Invites and saved room", Settings2],
  ["people", "People & permissions", "Members and room controls", Users],
  ["rooms", "My rooms", "Saved and associated rooms", Bookmark],
  ["privacy", "Privacy & account", "Privacy, identity and sign-in", Shield],
] as const;
type Category = (typeof categories)[number][0];
export function RoomSettings({
  room,
  liveRoom,
  account,
  accountNotice,
  onManage,
}: Pick<
  WatchModeLayoutProps,
  "room" | "liveRoom" | "account" | "accountNotice"
> & { onManage(): void }) {
  const [category, setCategory] = useState<Category | null>(null);
  const [accountTab, setAccountTab] = useState<"privacy" | "account">(
    "privacy",
  );
  const root = useRef<HTMLDivElement>(null);
  const connected = liveRoom.connectionStatus === "connected";
  const owner =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active";
  function open(next: Category | null) {
    const previous = category;
    setCategory(next);
    requestAnimationFrame(() => {
      const target = next
        ? root.current?.querySelector<HTMLButtonElement>("[data-settings-back]")
        : root.current?.querySelector<HTMLButtonElement>(
            `[data-category="${previous}"]`,
          );
      target?.focus();
    });
  }
  const label = categories.find((item) => item[0] === category)?.[1];
  return (
    <div className="room-settings" ref={root}>
      {category === null ? (
        <>
          <h2>Room &amp; account</h2>
          <p className="room-settings-intro">Choose what you want to manage.</p>
          <div className="room-settings-categories">
            {categories.map(([id, title, description, Icon]) => (
              <button key={id} data-category={id} onClick={() => open(id)}>
                <Icon aria-hidden />
                <span>
                  <strong>{title}</strong>
                  <small>
                    {id === "room" && room.kind === "personal"
                      ? "Personal room bookmark"
                      : description}
                  </small>
                </span>
                <ChevronRight aria-hidden />
              </button>
            ))}
            {owner && (
              <button onClick={onManage}>
                <Library aria-hidden />
                <span>
                  <strong>Library management</strong>
                  <small>Uploads, folders and processing</small>
                </span>
                <ChevronRight aria-hidden />
              </button>
            )}
          </div>
          <div className="room-settings-leave">
            <WatchLeaveButton>
              <DoorOpen aria-hidden />
              Leave room
            </WatchLeaveButton>
          </div>
        </>
      ) : (
        <>
          <button
            data-settings-back
            className="room-settings-back"
            onClick={() => open(null)}
          >
            <ArrowLeft aria-hidden />
            Back to settings
          </button>
          <h2>{label}</h2>
          <div className="room-settings-detail">
            {category === "room" ? (
              <>
                {room.kind !== "temporary" && <ListeningLearningSettings key={room.id} roomId={room.id} />}
                {room.kind === "themed" && (
                  <RoomDirectionPanel roomId={room.id} />
                )}
                {room.kind !== "personal" && <h3>Invite people</h3>}
                <InviteActions
                  inviteUrl={room.inviteUrl}
                  roomCode={room.code}
                />
                {room.kind === "temporary" ? <TemporaryRoomNotice/> : <>
                <h3>Save this room</h3>
                <WatchSavedRoomToggle
                  canSave={connected && liveRoom.canManageAuthority}
                  initialSaved={room.isSaved}
                  roomId={room.id}
                /></>}
              </>
            ) : category === "people" ? (
              <>
                {" "}
                {room.kind === "shared" && (
                  <SharedMembershipPanel roomId={room.id} />
                )}
                <MembersPanel
                  participants={liveRoom.participants}
                  canManageAuthority={connected && liveRoom.canManageAuthority}
                  connectionStatus={liveRoom.connectionStatus}
                  controllerMemberId={
                    liveRoom.participants.find((p) => p.isController)?.id
                  }
                  currentMemberId={room.currentMember?.id}
                  errorMessage={liveRoom.errorMessage}
                  grantControl={liveRoom.grantControl}
                  kickMember={liveRoom.kickMember}
                  onPermissionChange={liveRoom.setPermission}
                  removeIdleMember={liveRoom.removeIdleMember}
                  revokeControl={liveRoom.revokeControl}
                />
              </>
            ) : (
              <>
                {category === "privacy" && (
                  <div
                    className="room-settings-account-tabs"
                    role="group"
                    aria-label="Privacy and account"
                  >
                    <button
                      aria-pressed={accountTab === "privacy"}
                      onClick={() => setAccountTab("privacy")}
                    >
                      Privacy
                    </button>
                    <button
                      aria-pressed={accountTab === "account"}
                      onClick={() => setAccountTab("account")}
                    >
                      Account
                    </button>
                  </div>
                )}
                <AccountCommandPanel
                  key={category === "privacy" ? accountTab : category}
                  contentTab={category === "privacy" ? accountTab : category}
                  account={account}
                  notice={accountNotice}
                  nextPath={`/rooms/${room.id}`}
                  roomId={room.id}
                  roomAttached={room.isAttachedToAccount}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
