import { Crown, RadioTower, UserMinus, UserRound, UserX } from "lucide-react";
import { useMemo } from "react";
import { Avatar, Badge } from "@/components/ui";
import type { RoomParticipant } from "@/lib/rooms";
import { cx } from "@/lib/ui";

type MembersPanelProps = {
  canManageAuthority?: boolean;
  connectionStatus?: string;
  controllerMemberId?: string | null;
  currentMemberId?: string | null;
  errorMessage?: string | null;
  grantControl?: (memberId: string) => void;
  id?: string;
  kickMember?: (memberId: string) => void;
  onPermissionChange?: (
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ) => void;
  participants: RoomParticipant[];
  presentation?: "audience" | "default";
  removeIdleMember?: (memberId: string) => void;
  revokeControl?: () => void;
};

const permissionLabels = [
  { key: "queue", label: "Queue" },
  { key: "playback", label: "Playback" },
  { key: "browser", label: "Browser" },
] as const;

export function MembersPanel({
  canManageAuthority = false,
  connectionStatus = "idle",
  controllerMemberId,
  currentMemberId,
  errorMessage,
  grantControl,
  id,
  kickMember,
  onPermissionChange,
  participants,
  presentation = "default",
  removeIdleMember,
  revokeControl,
}: MembersPanelProps) {
  const audience = presentation === "audience";
  const groupedParticipants = useMemo(() => {
    const sorted = [...participants].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === "host" ? -1 : 1;
      }

      if (left.status !== right.status) {
        return left.status === "online" ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    return {
      active: sorted.filter((participant) => participant.status === "online"),
      idle: sorted.filter((participant) => participant.status === "idle"),
    };
  }, [participants]);

  return (
    <div
      className={cx(
        "grid min-w-0 gap-3",
        audience &&
          "h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/10 bg-background/18 p-2 shadow-[inset_0_0_18px_rgb(0_219_233_/_0.03)] backdrop-blur-[3px] lg:rounded-l-none",
      )}
      id={id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Members</Badge>
        <Badge tone={connectionStatus === "connected" ? "cyan" : "neutral"}>
          {connectionStatus}
        </Badge>
        {errorMessage ? (
          <span className="text-label-sm text-error">{errorMessage}</span>
        ) : null}
      </div>

      {audience ? <MemberChipRail participants={participants} /> : null}

      <div
        className={cx(
          "grid gap-3",
          audience &&
            "min-h-0 overflow-y-auto pr-1 [scrollbar-color:rgb(0_219_233_/_0.32)_transparent] [scrollbar-width:thin]",
        )}
      >
        <MemberSection
          canManageAuthority={canManageAuthority}
          controllerMemberId={controllerMemberId}
          currentMemberId={currentMemberId}
          grantControl={grantControl}
          heading="Active"
          compact={audience}
          onPermissionChange={onPermissionChange}
          participants={groupedParticipants.active}
          removeIdleMember={removeIdleMember}
          revokeControl={revokeControl}
          kickMember={kickMember}
        />

        {groupedParticipants.idle.length > 0 ? (
          <MemberSection
            canManageAuthority={canManageAuthority}
            controllerMemberId={controllerMemberId}
            currentMemberId={currentMemberId}
            grantControl={grantControl}
            heading="Idle"
            idle
            compact={audience}
            onPermissionChange={onPermissionChange}
            participants={groupedParticipants.idle}
            removeIdleMember={removeIdleMember}
            revokeControl={revokeControl}
            kickMember={kickMember}
          />
        ) : null}
      </div>
    </div>
  );
}

function MemberChipRail({ participants }: { participants: RoomParticipant[] }) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="min-w-0 overflow-x-auto [scrollbar-width:none]">
      <div className="flex w-max max-w-full gap-2">
        {participants.map((participant) => (
          <div
            className="inline-flex max-w-36 items-center gap-1.5 rounded-md border border-white/10 bg-background/18 px-1.5 py-1"
            key={participant.id}
          >
            <Avatar
              avatarKey={participant.avatarKey}
              className="h-6 w-6"
              crowned={participant.role === "host"}
              name={participant.name}
              seed={participant.id}
              status={participant.status}
            />
            <span className="truncate text-label-sm font-semibold text-on-surface">
              {participant.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberSection({
  canManageAuthority,
  compact = false,
  controllerMemberId,
  currentMemberId,
  grantControl,
  heading,
  idle = false,
  kickMember,
  onPermissionChange,
  participants,
  removeIdleMember,
  revokeControl,
}: {
  canManageAuthority: boolean;
  compact?: boolean;
  controllerMemberId?: string | null;
  currentMemberId?: string | null;
  grantControl?: (memberId: string) => void;
  heading: string;
  idle?: boolean;
  kickMember?: (memberId: string) => void;
  onPermissionChange?: (
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ) => void;
  participants: RoomParticipant[];
  removeIdleMember?: (memberId: string) => void;
  revokeControl?: () => void;
}) {
  if (participants.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-md border border-white/10 bg-background/14">
      <div
        className={cx(
          "flex items-center justify-between border-b border-white/10 px-3",
          compact ? "py-1.5" : "py-2",
          idle ? "bg-background/22" : "bg-surface-container/24",
        )}
      >
        <span className="technical-label border-0 p-0 text-on-surface-variant">
          {heading}
        </span>
        <span className="text-label-sm text-on-surface-variant">
          {participants.length}
        </span>
      </div>
      <ul className="divide-y divide-white/10">
        {participants.map((participant) => (
          <MemberRow
            canManageAuthority={canManageAuthority}
            compact={compact}
            controllerMemberId={controllerMemberId}
            currentMemberId={currentMemberId}
            grantControl={grantControl}
            key={participant.id}
            onPermissionChange={onPermissionChange}
            participant={participant}
            removeIdleMember={removeIdleMember}
            revokeControl={revokeControl}
            kickMember={kickMember}
          />
        ))}
      </ul>
    </section>
  );
}

function MemberRow({
  canManageAuthority,
  compact = false,
  controllerMemberId,
  currentMemberId,
  grantControl,
  kickMember,
  onPermissionChange,
  participant,
  removeIdleMember,
  revokeControl,
}: {
  canManageAuthority: boolean;
  compact?: boolean;
  controllerMemberId?: string | null;
  currentMemberId?: string | null;
  grantControl?: (memberId: string) => void;
  kickMember?: (memberId: string) => void;
  onPermissionChange?: (
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ) => void;
  participant: RoomParticipant;
  removeIdleMember?: (memberId: string) => void;
  revokeControl?: () => void;
}) {
  const isSelf = participant.id === currentMemberId;
  const isHost = participant.role === "host";
  const canEditMember = canManageAuthority && !isHost && !isSelf;

  return (
    <li
      className={cx(
        "grid transition hover:bg-surface-container-low/45",
        compact ? "gap-1.5 px-2.5 py-2" : "gap-2 px-3 py-3",
      )}
    >
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
        <Avatar
          avatarKey={participant.avatarKey}
          className={compact ? "h-8 w-8" : "h-9 w-9"}
          crowned={isHost}
          name={participant.name}
          seed={participant.id}
          status={participant.status}
        />
        <div className="min-w-0">
          <p
            className={cx(
              "truncate font-semibold text-on-surface",
              compact ? "text-label-sm" : "text-body-md",
            )}
          >
            {participant.name}
          </p>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-label-sm text-on-surface-variant">
            {isHost ? (
              <Crown
                className="h-3.5 w-3.5 text-secondary-fixed-dim"
                aria-hidden
              />
            ) : (
              <UserRound
                className="h-3.5 w-3.5 text-primary-fixed-dim"
                aria-hidden
              />
            )}
            {isSelf ? "you" : participant.role}
            {participant.isController ? (
              <>
                <RadioTower
                  className="ml-1 h-3.5 w-3.5 text-primary-fixed-dim"
                  aria-hidden
                />
                controller
              </>
            ) : null}
          </p>
        </div>
        <span
          className={cx(
            "rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
            compact && "px-1.5 py-0.5 text-[9px]",
            participant.status === "online"
              ? "border-primary-fixed-dim/35 bg-primary-fixed-dim/10 text-primary-fixed-dim"
              : "border-white/10 bg-surface-container-lowest text-on-surface-variant",
          )}
        >
          {participant.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {permissionLabels.map((permission) => {
          const active = participant.permissions[permission.key];

          return (
            <button
              aria-pressed={active}
              className={cx(
                "rounded-sm border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-65",
                compact && "px-1.5 py-0.5 text-[9px]",
                active
                  ? "border-primary-fixed-dim/30 bg-primary-fixed-dim/8 text-primary-fixed-dim"
                  : "border-white/10 bg-surface-container-lowest text-on-surface-variant",
                canEditMember && "hover:border-secondary-fixed-dim/35 hover:text-secondary-fixed-dim",
              )}
              disabled={!canEditMember}
              key={permission.key}
              onClick={() =>
                onPermissionChange?.(participant.id, permission.key, !active)
              }
              type="button"
            >
              {permission.label}
            </button>
          );
        })}
      </div>

      {canEditMember ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface disabled:opacity-45"
            disabled={controllerMemberId === participant.id}
            onClick={() =>
              participant.isController
                ? revokeControl?.()
                : grantControl?.(participant.id)
            }
            type="button"
          >
            <RadioTower className="h-3.5 w-3.5" aria-hidden />
            {participant.isController ? "Revoke" : "Control"}
          </button>
          {participant.status === "idle" ? (
            <button
              className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 text-label-sm font-semibold text-on-surface-variant transition hover:border-error/35 hover:bg-error/10 hover:text-error"
              onClick={() => removeIdleMember?.(participant.id)}
              type="button"
            >
              <UserMinus className="h-3.5 w-3.5" aria-hidden />
              Remove idle
            </button>
          ) : (
            <button
              className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-white/10 px-2 py-1 text-label-sm font-semibold text-on-surface-variant transition hover:border-error/35 hover:bg-error/10 hover:text-error"
              onClick={() => kickMember?.(participant.id)}
              type="button"
            >
              <UserX className="h-3.5 w-3.5" aria-hidden />
              Kick
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
