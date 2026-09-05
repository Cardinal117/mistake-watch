"use client";
import { useId, useRef, type ReactNode } from "react";
import { PendingLink } from "@/components/ui";

export function WatchLeaveButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className={className}
        aria-label="Leave room"
        onClick={() => dialog.current?.showModal()}
      >
        {children}
      </button>
      <dialog
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        ref={dialog}
        className="watch-leave-dialog"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>Leave this room?</h2>
        <p>You are about to leave the room and return to your dashboard.</p>
        <div>
          <button autoFocus onClick={() => dialog.current?.close()}>
            No, stay here
          </button>
          <PendingLink
            href="/"
            loadingLabel="Leaving room"
            loadingDetail="Returning to your dashboard."
          >
            Yes, leave room
          </PendingLink>
        </div>
      </dialog>
    </>
  );
}
