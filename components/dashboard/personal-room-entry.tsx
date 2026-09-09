"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Headphones, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui";

import { AccountCommandPanel } from "@/components/account";

import type { AccountSummary } from "@/lib/account/types";

import { openPersonalRoomAction } from "@/lib/rooms/personal-actions";

export function PersonalRoomEntry({ account }: { account: AccountSummary }) {
  const router = useRouter();

  const [pending, startTransition] = useTransition();

  const [error, setError] = useState("");

  const signedIn = account.status === "signed-in" && !account.isAnonymous;

  const eligible = signedIn && account.accountStatus === "active";

  return (
    <section
      aria-label="Personal room"
      className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-surface-container-low/50 p-4"
    >
      <div className="min-w-0">
        <h2 className="text-body-md font-semibold text-on-surface">
          Your Personal room
        </h2>

        <p className="mt-1 text-label-sm text-on-surface-variant">
          A private room that stays yours, across your devices.
        </p>
      </div>

      {signedIn ? (
        <Button
          disabled={pending || !eligible}
          onClick={() => {
            setError("");

            startTransition(async () => {
              const result = await openPersonalRoomAction();

              if (result.error) setError(result.error);
              else router.push(`/rooms/${result.roomId}`);
            });
          }}
        >
          {pending ? (
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Headphones aria-hidden className="h-4 w-4" />
          )}

          {pending
            ? "Opening your room…"
            : error
              ? "Try again"
              : "Open Personal room"}
        </Button>
      ) : (
        <AccountCommandPanel account={account} nextPath="/" compact />
      )}

      {!signedIn && (
        <p className="w-full text-label-sm text-on-surface-variant">
          Sign in to open your Personal room.
        </p>
      )}

      {signedIn && !eligible && (
        <p className="w-full text-label-sm text-on-surface-variant">
          An active account is required.
        </p>
      )}

      {error && (
        <p role="alert" className="w-full text-label-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}
