"use client";

import { Check, X } from "lucide-react";
import { Avatar, Button } from "@/components/ui";
import {
  useSelectedAvatarKey,
  writeStoredAvatarKey,
} from "@/lib/identity/avatar-selection";
import { avatarCatalog, type AvatarKey } from "@/lib/identity/avatars";
import { cx } from "@/lib/ui";

type AvatarPickerProps = {
  name: string;
  onClose(): void;
  open: boolean;
  role?: "guest" | "host";
  seed?: string | null;
};

export function AvatarPicker({
  name,
  onClose,
  open,
  role = "guest",
  seed,
}: AvatarPickerProps) {
  const { avatarKey } = useSelectedAvatarKey(seed ?? name);

  if (!open) {
    return null;
  }

  function selectAvatar(nextKey: AvatarKey) {
    writeStoredAvatarKey(nextKey);
  }

  return (
    <div
      aria-labelledby="avatar-picker-title"
      aria-modal="true"
      className="fixed inset-0 z-[110] grid place-items-center bg-surface-container-lowest/84 px-4 backdrop-blur-xl"
      role="dialog"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-surface/96 shadow-screen-glow">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              avatarKey={avatarKey}
              className="h-14 w-14"
              crowned={role === "host"}
              name={name}
              seed={seed ?? name}
              status="online"
            />
            <div className="min-w-0">
              <p className="technical-label text-primary-fixed-dim">
                Account Avatar
              </p>
              <h2
                className="mt-1 text-headline-md font-semibold text-on-surface"
                id="avatar-picker-title"
              >
                Choose your hardware avatar
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                Saved on this browser for the guest-first release.
              </p>
            </div>
          </div>
          <button
            aria-label="Close avatar picker"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {avatarCatalog.map((avatar) => {
            const selected = avatar.key === avatarKey;

            return (
              <button
                aria-pressed={selected}
                className={cx(
                  "grid min-w-0 gap-3 rounded-md border bg-surface-container-low p-3 text-left transition",
                  selected
                    ? "border-primary-fixed-dim/55 bg-primary-fixed-dim/10 shadow-[0_0_20px_rgb(0_219_233_/_0.14)]"
                    : "border-white/10 hover:border-primary-fixed-dim/35 hover:bg-surface-container",
                )}
                key={avatar.key}
                onClick={() => selectAvatar(avatar.key)}
                type="button"
              >
                <span className="relative inline-flex">
                  <Avatar
                    avatarKey={avatar.key}
                    className="h-16 w-16"
                    crowned={role === "host" && selected}
                    name={name}
                    seed={seed ?? name}
                  />
                  {selected ? (
                    <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-primary-fixed-dim/40 bg-primary-fixed-dim text-on-primary-fixed">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-body-md font-semibold text-on-surface">
                    {avatar.label}
                  </span>
                  <span className="mt-1 block text-label-sm text-on-surface-variant">
                    {avatar.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-white/10 p-4">
          <Button onClick={onClose} size="sm" type="button">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
