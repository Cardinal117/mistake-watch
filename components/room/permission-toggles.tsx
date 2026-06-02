import { LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RoomParticipant } from "@/lib/rooms";

type PermissionTogglesProps = {
  canManageAuthority?: boolean;
  id?: string;
  onPermissionChange?: (
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ) => void;
  participants: RoomParticipant[];
};

const permissionLabels = [
  { key: "queue", label: "Queue" },
  { key: "playback", label: "Playback" },
  { key: "browser", label: "Browser" },
] as const;

export function PermissionToggles({
  canManageAuthority = false,
  id,
  onPermissionChange,
  participants,
}: PermissionTogglesProps) {
  const guests = participants.filter(
    (participant) => participant.role !== "host",
  );

  return (
    <div className="grid min-w-0 gap-4" id={id}>
      <div>
        <Badge tone="amber">Permissions</Badge>
        <h2 className="mt-3 text-headline-md font-semibold text-on-surface">
          Host controls
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Permission changes are applied through the live room authority.
        </p>
      </div>

      <div className="grid gap-3">
        {guests.map((participant) => (
          <div
            className="rounded-md border border-white/10 bg-surface-container-low p-3"
            key={participant.id}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="truncate text-body-md font-semibold text-on-surface">
                {participant.name}
              </p>
              <LockKeyhole
                className="h-4 w-4 text-secondary-fixed-dim"
                aria-hidden
              />
            </div>
            <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
              {permissionLabels.map((permission) => {
                const active = participant.permissions[permission.key];

                return (
                  <button
                    aria-pressed={active}
                    className={
                      active
                        ? "technical-label rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/12 px-2 py-1 text-center text-primary-fixed-dim"
                        : "technical-label rounded-sm border border-white/10 bg-surface-container px-2 py-1 text-center text-on-surface-variant"
                    }
                    disabled={!canManageAuthority}
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
                    {permission.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
