"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui";

type InviteActionsProps = {
  inviteUrl?: string;
  roomCode: string;
};

export function InviteActions({ inviteUrl, roomCode }: InviteActionsProps) {
  const [status, setStatus] = useState<
    "copied" | "idle" | "link-copied" | "shared"
  >("idle");
  const inviteText = useMemo(
    () =>
      inviteUrl
        ? toAbsoluteUrl(inviteUrl)
        : typeof window !== "undefined"
          ? window.location.href
          : "",
    [inviteUrl],
  );

  async function copyInvite() {
    const copied = await writeClipboard(inviteText);

    if (copied) {
      setTemporaryStatus("copied");
    }
  }

  async function copyRoomLink() {
    const copied = await writeClipboard(inviteText);

    if (copied) {
      setTemporaryStatus("link-copied");
    }
  }

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          text: "Join my Mistake Watch room.",
          title: "Join Mistake Watch",
          url: inviteText,
        });
        setTemporaryStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyInvite();
  }

  function setTemporaryStatus(nextStatus: "copied" | "link-copied" | "shared") {
    setStatus(nextStatus);
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-surface-container-low p-3">
      <span className="technical-label text-primary-fixed-dim">Invite</span>
      <div className="grid gap-1">
        <span className="technical-label text-primary-fixed-dim">
          Room Code
        </span>
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-body-md font-semibold text-on-surface">
            {roomCode}
          </span>
          <button
            aria-label="Copy invite link"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/10"
            onClick={copyRoomLink}
            type="button"
          >
            {status === "link-copied" ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Copy className="h-4 w-4" aria-hidden />
            )}
          </button>
        </span>
      </div>
      {inviteUrl ? (
        <a
          className="truncate rounded-md border border-white/10 bg-surface-container-low px-3 py-2 text-label-sm text-primary-fixed-dim underline-offset-4 hover:underline"
          href={toAbsoluteUrl(inviteUrl)}
        >
          {toAbsoluteUrl(inviteUrl)}
        </a>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          aria-live="polite"
          className="w-full"
          onClick={copyInvite}
          size="sm"
          variant="secondary"
        >
          {status === "copied" ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          <span className="hidden min-[360px]:inline">
            {status === "copied" ? "Copied" : "Copy Link"}
          </span>
          <span className="min-[360px]:hidden">
            {status === "copied" ? "Done" : "Copy"}
          </span>
        </Button>
        <Button
          className="w-full"
          onClick={shareInvite}
          size="sm"
          variant="ghost"
        >
          {status === "shared" ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden />
          )}
          {status === "shared" ? "Shared" : "Share"}
        </Button>
      </div>
    </div>
  );
}

function toAbsoluteUrl(pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  if (typeof window === "undefined") {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, window.location.origin).toString();
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return legacyCopy(text);
    }
  }

  return legacyCopy(text);
}

function legacyCopy(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}
