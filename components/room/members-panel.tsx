import { Crown, RadioTower, UserMinus, UserRound, UserX } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import type { RoomParticipant } from "@/lib/rooms";
import { cx } from "@/lib/ui";

type MembersPanelProps = {
  canManageAuthority?: boolean;
  connectionStatus?: string;
  controllerMemberId?: string | null;
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
  errorMessage,
  grantControl,
  id,
  kickMember,
  onPermissionChange,
  participants,
  removeIdleMember,
  revokeControl,
}: MembersPanelProps) {
  return (
    <div className="grid min-w-0 gap-4" id={id}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Members</Badge>
          <Badge tone={connectionStatus === "connected" ? "cyan" : "neutral"}>
            {connectionStatus}
          </Badge>
        </div>
        <h2 className="mt-3 text-headline-md font-semibold text-on-surface">
          Room members
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          View status and adjust room permissions from one place.
        </p>
        {errorMessage ? (
          <p className="mt-2 text-body-md text-error">{errorMessage}</p>
        ) : null}
      </div>

      <ul className="grid gap-3">
        {participants.map((participant) => (
          <li
            className="grid gap-3 rounded-md border border-white/10 bg-surface-container-low p-3"
            key={participant.id}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  avatarKey={participant.avatarKey}
                  className="h-9 w-9"
                  crowned={participant.role === "host"}
                  name={participant.name}
                  seed={participant.id}
                  status={participant.status}
                />
                <div className="min-w-0">
                  <p className="truncate text-body-md font-semibold text-on-surface">
                    {participant.name}
                  </p>
                  <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-label-sm text-on-surface-variant">
                    {participant.role === "host" ? (
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
                    {participant.role}
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
              </div>
              <Badge
                className="shrink-0"
                tone={participant.status === "online" ? "cyan" : "neutral"}
              >
                {participant.status}
              </Badge>
            </div>

            <div className="grid gap-2">
              <div className="flex flex-wrap gap-1.5">
                {permissionLabels.map((permission) => {
                  const active = participant.permissions[permission.key];

                  return (
                    <span
                      className={cx(
                        "technical-label rounded-sm border px-2 py-1",
                        active
                          ? "border-primary-fixed-dim/35 bg-primary-fixed-dim/12 text-primary-fixed-dim shadow-[0_0_14px_rgb(0_219_233_/_0.14)]"
                          : "border-white/10 bg-surface-container text-on-surface-variant/75",
                      )}
                      key={permission.key}
                    >
                      {permission.label}
                    </span>
                  );
                })}
              </div>

              <div className="grid gap-1.5 min-[420px]:grid-cols-3">
                {permissionLabels.map((permission) => {
                  const active = participant.permissions[permission.key];
                  const locked = participant.role === "host";

                  return (
                    <button
                      aria-pressed={active}
                      className={cx(
                        "technical-label rounded-sm border px-2 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-55",
                        active
                          ? "border-primary-fixed-dim/35 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                          : "border-white/10 bg-surface-container text-on-surface-variant hover:text-on-surface",
                      )}
                      disabled={!canManageAuthority || locked}
                      key={permission.key}
                      onClick={() =>
                        onPermissionChange?.(
                          participant.id,
                          permission.key,
                          !active,
                        )
                      }
                      type="button"
                    >
                      {active ? "Allow" : "Block"} {permission.label}
                    </button>
                  );
                })}
              </div>

              {canManageAuthority && participant.role !== "host" ? (
                <div className="flex flex-wrap gap-2">
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
                    {participant.isController
                      ? "Revoke controller"
                      : "Grant controller"}
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
