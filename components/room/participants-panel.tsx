import { Crown, RadioTower, UserRound } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui";
import type { RoomParticipant } from "@/lib/rooms";

type ParticipantsPanelProps = {
  canManageAuthority?: boolean;
  connectionStatus?: string;
  controllerMemberId?: string | null;
  errorMessage?: string | null;
  grantControl?: (memberId: string) => void;
  id?: string;
  participants: RoomParticipant[];
  revokeControl?: () => void;
};

export function ParticipantsPanel({
  canManageAuthority = false,
  connectionStatus = "idle",
  controllerMemberId,
  errorMessage,
  grantControl,
  id,
  participants,
  revokeControl,
}: ParticipantsPanelProps) {
  return (
    <div className="grid min-w-0 gap-4" id={id}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">People</Badge>
          <Badge tone={connectionStatus === "connected" ? "cyan" : "neutral"}>
            {connectionStatus}
          </Badge>
        </div>
        <h2 className="mt-3 text-headline-md font-semibold text-on-surface">
          In the room
        </h2>
        {errorMessage ? (
          <p className="mt-1 text-body-md text-error">{errorMessage}</p>
        ) : null}
      </div>

      <ul className="grid gap-3">
        {participants.map((participant) => (
          <li
            className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-surface-container-low p-3"
            key={participant.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                avatarKey={participant.avatarKey}
                crowned={participant.role === "host"}
                name={participant.name}
                seed={participant.id}
                status={participant.status}
              />
              <div className="min-w-0">
                <p className="truncate text-body-md font-semibold text-on-surface">
                  {participant.name}
                </p>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-label-sm text-on-surface-variant">
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
            <div className="flex shrink-0 items-center gap-2">
              <Badge
                className="shrink-0"
                tone={participant.status === "online" ? "cyan" : "neutral"}
              >
                {participant.status}
              </Badge>
              {canManageAuthority && participant.role !== "host" ? (
                participant.isController ? (
                  <Button
                    aria-label={`Revoke control from ${participant.name}`}
                    onClick={revokeControl}
                    size="sm"
                    variant="ghost"
                  >
                    Revoke
                  </Button>
                ) : (
                  <Button
                    aria-label={`Grant control to ${participant.name}`}
                    disabled={controllerMemberId === participant.id}
                    onClick={() => grantControl?.(participant.id)}
                    size="sm"
                    variant="secondary"
                  >
                    Grant
                  </Button>
                )
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
