import {
  Circle,
  Crown,
  Diamond,
  Hexagon,
  Sparkle,
  Square,
  Star,
  Triangle,
  User,
} from "lucide-react";
import type { HTMLAttributes } from "react";
import {
  getAvatarByKey,
  getDeterministicAvatarKey,
  hostCrownSrc,
} from "@/lib/identity/avatars";
import {
  getParticipantIconIndex,
  getParticipantVisual,
} from "@/lib/rooms/participant-visual";
import { cx } from "@/lib/ui";

type AvatarProps = HTMLAttributes<HTMLDivElement> & {
  avatarKey?: string | null;
  crowned?: boolean;
  name: string;
  seed?: string;
  src?: string;
  status?: "online" | "idle" | "offline";
};

const avatarIcons = [
  User,
  Star,
  Sparkle,
  Diamond,
  Triangle,
  Square,
  Circle,
  Hexagon,
];

export function Avatar({
  className,
  avatarKey,
  crowned = false,
  name,
  seed,
  src,
  status,
  ...props
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const visualSeed = seed ?? name;
  const visual = getParticipantVisual(visualSeed);
  const Icon =
    avatarIcons[getParticipantIconIndex(visualSeed, avatarIcons.length)];
  const selectedAvatar =
    getAvatarByKey(avatarKey) ??
    getAvatarByKey(getDeterministicAvatarKey(seed));

  return (
    <div
      className={cx("relative inline-flex h-10 w-10 shrink-0", className)}
      {...props}
    >
      <div
        className={cx(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-md border text-label-sm font-semibold",
          visual.accentClassName,
        )}
      >
        {src || selectedAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-full w-full object-cover"
            src={src ?? selectedAvatar?.src}
          />
        ) : (
          <span className="grid place-items-center gap-0.5">
            <Icon className="h-4 w-4" aria-hidden />
            {initials ? (
              <span className="text-[9px] font-bold leading-none">
                {initials}
              </span>
            ) : null}
          </span>
        )}
      </div>
      {crowned ? (
        <span
          aria-label="host"
          className="absolute -right-1.5 -top-2 inline-flex h-5 w-5 items-center justify-center"
          role="img"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            className="h-full w-full object-contain drop-shadow-[0_0_8px_rgb(255_186_32_/_0.55)]"
            src={hostCrownSrc}
          />
          <Crown className="sr-only" aria-hidden />
        </span>
      ) : null}
      {status ? (
        <span
          aria-label={status}
          className={cx(
            "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-surface",
            status === "online" && "bg-primary-fixed-dim",
            status === "idle" && "bg-secondary-fixed-dim",
            status === "offline" && "bg-outline-variant",
          )}
          role="img"
        />
      ) : null}
    </div>
  );
}
