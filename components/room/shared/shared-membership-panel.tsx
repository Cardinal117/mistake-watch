"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  sharedContextAction,
  decideSharedMembershipAction,
  saveSharedConsentAction,
  type SharedContext,
} from "@/lib/rooms/shared-actions";
export function SharedMembershipPanel({ roomId }: { roomId: string }) {
  const loadVersion = useRef(0);
  const [data, setData] = useState<SharedContext | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [contribute, setContribute] = useState(false);
  const [individual, setIndividual] = useState(false);
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    const d = await sharedContextAction(roomId);
    if (version !== loadVersion.current) return;
    setData(d);
    setContribute(d?.contribute ?? false);
    setIndividual(d?.individual ?? false);
  }, [roomId]);
  useEffect(() => {
    void load().catch(() =>
      setError("Could not load membership. Use Refresh."),
    );
    // React effect replay or a later refresh must not restore an older form value.
    return () => {
      loadVersion.current += 1;
    };
  }, [load]);
  function run(action: () => Promise<{ error?: string }>) {
    setError("");
    setMessage("");
    start(async () => {
      try {
        const r = await action();
        if (r.error) setError(r.error);
        else setMessage("Saved.");
        await load();
      } catch {
        setError("Could not save changes. Please retry.");
      }
    });
  }
  return (
    <section
      aria-label="Shared membership and learning"
      className="mb-4 grid min-w-0 gap-3 rounded-md border border-white/10 p-3 text-label-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Shared membership &amp; learning</h3>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await load();
              return {};
            })
          }
        >
          Refresh
        </Button>
      </div>
      {data?.state === "approved" && (
        <>
          <p>
            Your learning choices are separate from joining and playback
            permissions. Blended recommendations are still being developed.
          </p>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-[rgb(var(--listen-primary))]"
              checked={contribute}
              onChange={(e) => setContribute(e.target.checked)}
              disabled={pending}
            />
            Use my choices in this room’s blend
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-[rgb(var(--listen-primary))]"
              checked={individual}
              onChange={(e) => setIndividual(e.target.checked)}
              disabled={pending}
            />
            Learn my personal taste from my actions here
          </label>
          <p>
            Turning either off stops that use of past contributions too. Likes
            remain your explicit choices.
          </p>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => saveSharedConsentAction(roomId, contribute, individual))
            }
          >
            Save learning choices
          </Button>
        </>
      )}
      {data?.owner && (
        <>
          <h4 className="font-semibold">Requests &amp; return access</h4>
          <p>
            Leaving preserves approved access. Remove revokes it on every
            device.
          </p>
          {data.members.length === 0 && <p>No membership requests yet.</p>}
          {data.members.map((m) => (
            <div
              key={m.userId}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"
            >
              <span className="min-w-0 break-words">
                {m.name} · {m.state}
              </span>
              <div className="flex flex-wrap gap-2">
                {m.state !== "approved" && !m.revocationPending && (
                  <Button
                    variant="secondary"
                    aria-label={`Approve ${m.name}`}
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        decideSharedMembershipAction(roomId, m.userId, true),
                      )
                    }
                  >
                    Approve
                  </Button>
                )}
                {(m.state !== "removed" || m.revocationPending) && (
                  <Button
                    variant="ghost"
                    aria-label={`${m.revocationPending ? "Retry live removal" : m.state === "pending" ? "Reject" : "Remove"} ${m.name}`}
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        decideSharedMembershipAction(roomId, m.userId, false),
                      )
                    }
                  >
                    {m.revocationPending
                      ? "Retry live removal"
                      : m.state === "pending"
                        ? "Reject"
                        : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
    </section>
  );
}
