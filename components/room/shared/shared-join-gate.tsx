"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { AccountCommandPanel } from "@/components/account";
import type { AccountSummary } from "@/lib/account/types";
import {
  requestSharedMembershipAction,
  sharedContextAction,
  type SharedContext,
} from "@/lib/rooms/shared-actions";
export function SharedJoinGate({
  roomId,
  invite,
  initial,
  account,
}: {
  roomId: string;
  invite: string;
  initial: SharedContext;
  account: AccountSummary;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const signedIn =
    account.status === "signed-in" &&
    !account.isAnonymous &&
    account.accountStatus === "active";
  function check(request = false) {
    start(async () => {
      try {
        setError("");
        if (request) {
          const r = await requestSharedMembershipAction(roomId, invite);
          if (r.error) {
            setError(r.error);
            return;
          }
        }
        const next = await sharedContextAction(roomId, invite);
        if (next?.state === "approved") router.refresh();
        else if (next) setData(next);
        else setError("This invitation is no longer available.");
      } catch {
        setError("Could not check access. Please retry.");
      }
    });
  }
  return (
    <main className="mx-auto grid w-full max-w-xl gap-4 p-6 text-on-surface">
      <h1 className="text-headline-md">{data.name}</h1>
      <p>
        This Shared room requires the owner’s approval. Joining does not enable
        learning.
      </p>
      {!signedIn ? (
        <AccountCommandPanel
          account={account}
          nextPath={`/rooms/${roomId}?invite=${encodeURIComponent(invite)}`}
        />
      ) : (
        <>
          <p role="status">
            {data.state === "pending"
              ? "Your request is waiting for the owner."
              : data.state === "removed"
                ? "Access was declined or removed. Only the owner can approve it again."
                : "Request access to join this room and return later."}
          </p>
          <Button
            disabled={pending}
            onClick={() => check(data.state === "invited")}
          >
            {pending
              ? "Checking…"
              : data.state === "invited"
                ? "Request to join"
                : "Check approval"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-error">
          {error}
        </p>
      )}
      <Link href="/">Back to your rooms</Link>
    </main>
  );
}
