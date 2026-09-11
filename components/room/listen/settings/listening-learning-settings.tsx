"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

type Settings = {
  roomKind: string;
  allowed: boolean;
  epoch: string | null;
  purposeVersion: number;
  historyGeneration: number;
};
type Counts = { items: { completedPlayCount: number }[] };
const changedEvent = "mw-listening-settings-changed";

export function ListeningLearningSettings({ roomId }: { roomId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<number | null>(null);
  const requestVersion = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/recommendations/listening/settings?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" },
      );
      if (version !== requestVersion.current) return;
      if (response.status === 403) {
        setHidden(true);
        setSettings(null);
        return;
      }
      if (!response.ok)
        throw new Error(
          "Listening settings are temporarily unavailable. Try again.",
        );
      const data = (await response.json()) as { settings: Settings };
      if (version !== requestVersion.current) return;
      setSettings(data.settings);
      setAllowed(data.settings.allowed);
      setHidden(false);
      const result = await fetch(
        `/api/recommendations/listening/counts?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" },
      );
      const totals = result.ok ? ((await result.json()) as Counts) : null;
      if (version === requestVersion.current)
        setCounts(
          totals?.items?.reduce(
            (sum, item) => sum + item.completedPlayCount,
            0,
          ) ?? null,
        );
    } catch (cause) {
      if (version === requestVersion.current) {
        setSettings(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Listening settings are temporarily unavailable.",
        );
      }
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }, [roomId]);

  const invalidate = useCallback(() => {
    requestVersion.current++;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setError("");
      setMessage("");
      setConfirmClear(false);
      void load();
    }, 0);
    const refresh = () => {
      setConfirmClear(false);
      void load();
    };
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      invalidate();
      window.removeEventListener("focus", refresh);
    };
  }, [load, invalidate]);

  async function save(clear: boolean) {
    if (!settings || busy || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const version = requestVersion.current;
    try {
      const response = await fetch(
        `/api/recommendations/listening/${clear ? "history" : "settings"}`,
        {
          method: clear ? "DELETE" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            clear
              ? { roomId, expectedGeneration: settings.historyGeneration }
              : {
                  roomId,
                  allowListening: allowed,
                  purposeVersion: 1,
                  expectedEpoch: settings.epoch,
                },
          ),
        },
      );
      if (version !== requestVersion.current) return;
      setConfirmClear(false);
      if (response.status === 409) {
        setError(
          "Settings changed elsewhere. Review the refreshed settings before trying again.",
        );
        await load();
        return;
      }
      if (!response.ok)
        throw new Error(
          "Could not save listening settings. Refresh before trying again.",
        );
      window.dispatchEvent(new Event(changedEvent));
      setMessage(
        clear
          ? "Listening history cleared. Your Likes and manual choices are kept."
          : "Listening permission saved.",
      );
      await load();
    } catch (cause) {
      if (version === requestVersion.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not save listening settings.",
        );
    } finally {
      inFlight.current = false;
      if (version === requestVersion.current) setBusy(false);
    }
  }

  if (hidden) return null;
  return (
    <section
      aria-label="Account listening learning"
      className="space-y-3 border-t border-white/10 pt-4 text-body-sm text-on-surface-variant"
    >
      <h3 className="font-semibold text-on-surface">
        Listening &amp; personal taste
      </h3>
      {settings?.roomKind === "shared" ? (
        <>
          <label className="flex min-h-11 items-start gap-3 py-2">
            <input
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
              type="checkbox"
              checked={allowed}
              disabled={busy}
              onChange={(event) => setAllowed(event.target.checked)}
            />
            <span>
              Learn my taste from music I listen to here, including music other
              people add.
            </span>
          </label>
          <p>
            This permission is separate from sharing queue choices. Turning it
            off excludes this room’s listening from your taste profile. Likes
            always belong to your account.
          </p>
          <Button
            variant="secondary"
            disabled={busy || allowed === settings.allowed}
            onClick={() => void save(false)}
          >
            Save listening permission
          </Button>
        </>
      ) : settings ? (
        <p>
          Eligible listening in your Personal room and Themed rooms you own can
          inform your account’s recommendations. Likes remain account-wide.
        </p>
      ) : busy ? (
        <p role="status">Loading listening settings…</p>
      ) : null}
      {settings && (
        <>
          <p>
            Listener measurement currently supports direct media and uploads.
            YouTube listener measurement is not enabled while provider review is
            pending.
          </p>
          {counts !== null && (
            <p>
              {counts} verified listener{" "}
              {counts === 1 ? "completion" : "completions"} in the last 180
              days. This is separate from existing YouTube room-history counts.
            </p>
          )}
          <p>
            Clear listening history across your account to remove its
            contribution to listening counts and recommendations. Your Likes and
            manual queue choices are kept.
          </p>
          {confirmClear ? (
            <div
              className="space-y-2"
              role="group"
              aria-label="Confirm clear listening history"
            >
              <p className="text-on-surface">
                Clear listening history from all your rooms?
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void save(true)}
                >
                  Confirm clear history
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirmClear(true)}
            >
              Clear listening history
            </Button>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <div className="space-y-2">
          <p role="alert">{error}</p>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              setError("");
              void load();
            }}
          >
            Refresh listening settings
          </Button>
        </div>
      )}
    </section>
  );
}
