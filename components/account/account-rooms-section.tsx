"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";

import { buttonClassName } from "@/components/ui";
import type { AccountRoomSummary } from "@/lib/account/room-projection";
import {
  ACCOUNT_ROOMS_REFRESH_INTERVAL_MS,
  shouldApplyAccountRoomSnapshot,
  shouldRefreshAccountRooms,
} from "@/lib/account/room-refresh-policy";

import { AccountRoomListView } from "./account-room-list-view";

type AccountRoomsResponse = {
  error?: string;
  rooms?: AccountRoomSummary[];
};

export function AccountRoomsSection({
  currentRoomId,
  onCountChange,
  signedIn,
}: {
  currentRoomId?: string;
  onCountChange?(count: number | null): void;
  signedIn: boolean;
}) {
  if (!signedIn) {
    return (
      <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
        <h4 className="text-headline-md font-semibold text-on-surface">
          Local room access
        </h4>
        <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
          Guest rooms remain tied to this browser until you attach them to a
          signed-in account.
        </p>
      </section>
    );
  }

  return (
    <SignedInAccountRooms
      currentRoomId={currentRoomId}
      onCountChange={onCountChange}
    />
  );
}

function SignedInAccountRooms({
  currentRoomId,
  onCountChange,
}: {
  currentRoomId?: string;
  onCountChange?(count: number | null): void;
}) {
  const [rooms, setRooms] = useState<AccountRoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestRevision, setRequestRevision] = useState(0);

  useEffect(() => {
    onCountChange?.(rooms?.length ?? null);
  }, [onCountChange, rooms]);

  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    let requestPending = false;
    let requestSequence = 0;

    async function loadRooms() {
      if (requestPending) return;

      requestPending = true;
      const currentRequestSequence = ++requestSequence;

      try {
        const response = await fetch("/api/account/rooms", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as AccountRoomsResponse;

        if (!response.ok || !payload.rooms) {
          throw new Error(
            payload.error ?? "Account rooms could not be loaded.",
          );
        }

        if (
          !shouldApplyAccountRoomSnapshot({
            disposed,
            latestRequestSequence: requestSequence,
            requestSequence: currentRequestSequence,
          })
        ) {
          return;
        }

        setRooms(payload.rooms);
        setError(null);
      } catch (loadError) {
        if (
          !controller.signal.aborted &&
          shouldApplyAccountRoomSnapshot({
            disposed,
            latestRequestSequence: requestSequence,
            requestSequence: currentRequestSequence,
          })
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Account rooms could not be loaded.",
          );
        }
      } finally {
        if (currentRequestSequence === requestSequence) {
          requestPending = false;
        }
      }
    }

    function refreshOnActivity() {
      if (
        shouldRefreshAccountRooms({
          documentHidden: document.hidden,
          online: navigator.onLine,
          requestPending,
        })
      ) {
        void loadRooms();
      }
    }

    void loadRooms();
    const interval = window.setInterval(
      refreshOnActivity,
      ACCOUNT_ROOMS_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", refreshOnActivity);
    window.addEventListener("online", refreshOnActivity);
    document.addEventListener("visibilitychange", refreshOnActivity);

    return () => {
      disposed = true;
      requestSequence += 1;
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnActivity);
      window.removeEventListener("online", refreshOnActivity);
      document.removeEventListener("visibilitychange", refreshOnActivity);
    };
  }, [requestRevision]);

  return (
    <section aria-label="Account rooms" className="grid gap-4">
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error/30 bg-error/10 p-4">
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
          <button
            className={buttonClassName({ size: "sm", variant: "secondary" })}
            onClick={() => {
              setError(null);
              setRequestRevision((revision) => revision + 1);
            }}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        </div>
      ) : null}

      {rooms === null ? (
        error ? null : (
          <AccountRoomsLoading />
        )
      ) : rooms.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-container-lowest/42 p-5">
          <Users className="h-5 w-5 text-primary-fixed-dim" aria-hidden />
          <p className="mt-3 text-body-md font-semibold text-on-surface">
            No account rooms yet
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Create or join a room, then attach it to keep it available across
            signed-in devices.
          </p>
        </div>
      ) : (
        <AccountRoomListView
          currentRoomId={currentRoomId}
          onChanged={() => {
            setRequestRevision((revision) => revision + 1);
          }}
          rooms={rooms}
        />
      )}
    </section>
  );
}

function AccountRoomsLoading() {
  return (
    <div
      aria-label="Loading account rooms"
      className="grid gap-2"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <div
          className="h-20 animate-pulse rounded-md border border-white/10 bg-surface-container-lowest/42"
          key={row}
        />
      ))}
    </div>
  );
}
