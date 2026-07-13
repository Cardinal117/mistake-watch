"use client";

import { Upload } from "lucide-react";

import { MediaProcessingStatus } from "../../media-processing-status";
import { resolveRecoverableUploadDisplayState } from "@/lib/media/processing-display-state";
import type { SignalDisplayState } from "@/lib/status/display-state";
import type { BatchUploadItem, ResumableMediaUpload } from "../contracts";
import { formatBytes, formatDateTime } from "../presentation";

export function BatchUploadQueue({
  items,
  paused,
  onApproveAll,
  onApproveItem,
  onCancelItem,
  onCancelWaiting,
  onClearCompleted,
  onPauseChange,
  onRetryItem,
}: {
  items: BatchUploadItem[];
  paused: boolean;
  onApproveAll(): Promise<void> | void;
  onApproveItem(itemId: string): void;
  onCancelItem(itemId: string): void;
  onCancelWaiting(): void;
  onClearCompleted(): void;
  onPauseChange(paused: boolean): void;
  onRetryItem(itemId: string): void;
}) {
  const activeCount = items.filter((item) => item.status === "active").length;
  const waitingCount = items.filter((item) => item.status === "waiting").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const readyCount = items.filter((item) => item.status === "ready").length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;

  return (
    <section className="grid gap-2 border-l border-primary-fixed-dim/35 bg-primary-fixed-dim/5 pl-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="technical-label text-primary-fixed-dim">Upload queue</p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            One file uploads at a time. Waiting files continue if one item
            fails.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-white/10 bg-background/20 px-2 py-1 text-label-sm text-on-surface-variant">
            {items.length} files
          </span>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/16 px-2 text-label-sm font-semibold text-on-surface-variant transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!waitingCount}
            onClick={() => onPauseChange(!paused)}
            type="button"
          >
            {paused ? "Resume queue" : "Pause queue"}
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 px-2 text-label-sm font-semibold text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!blockedCount}
            onClick={() => void onApproveAll()}
            type="button"
          >
            Approve all
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/16 px-2 text-label-sm font-semibold text-on-surface-variant transition hover:border-error/30 hover:text-error disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!waitingCount && !failedCount}
            onClick={onCancelWaiting}
            type="button"
          >
            Cancel waiting
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/16 px-2 text-label-sm font-semibold text-on-surface-variant transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim disabled:cursor-not-allowed disabled:opacity-45"
            disabled={
              !readyCount && !items.some((item) => item.status === "cancelled")
            }
            onClick={onClearCompleted}
            type="button"
          >
            Clear done
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-on-surface-variant">
        <span>Active {activeCount}</span>
        <span>Waiting {waitingCount}</span>
        <span>Needs approval {blockedCount}</span>
        <span>Failed {failedCount}</span>
        <span>Ready {readyCount}</span>
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <article
            className="grid gap-2 rounded-sm border border-white/10 bg-background/18 p-2"
            key={item.id}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-label-sm font-semibold text-on-surface">
                  {item.fileName}
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  {formatBytes(item.fileSizeBytes)}
                  {item.folderId ? " / folder selected" : " / unsorted"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.status === "failed" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/10 px-2 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/15"
                    onClick={() => onRetryItem(item.id)}
                    type="button"
                  >
                    Retry
                  </button>
                ) : null}
                {item.status === "blocked" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-sm border border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 px-2 text-label-sm font-semibold text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/15"
                    onClick={() => onApproveItem(item.id)}
                    type="button"
                  >
                    Approve
                  </button>
                ) : null}
                {item.status === "waiting" ||
                item.status === "failed" ||
                item.status === "blocked" ? (
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-sm border border-error/30 bg-error/8 px-2 text-label-sm font-semibold text-error transition hover:bg-error/12"
                    onClick={() => onCancelItem(item.id)}
                    type="button"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
            <MediaProcessingStatus compact state={item.displayState} />
          </article>
        ))}
      </div>
    </section>
  );
}

export function ResumableUploadList({
  onCancelUpload,
  onResumeUpload,
  progressByUploadId,
  sessions,
}: {
  onCancelUpload(session: ResumableMediaUpload): void;
  onResumeUpload(session: ResumableMediaUpload): void;
  progressByUploadId: Record<string, SignalDisplayState>;
  sessions: ResumableMediaUpload[];
}) {
  return (
    <section className="grid gap-2 border-l border-secondary-fixed-dim/35 bg-secondary-fixed-dim/5 pl-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="technical-label text-secondary-fixed-dim">
            Recoverable uploads
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Reselect the same local file to resume only the missing R2 parts.
          </p>
        </div>
        <span className="rounded-sm border border-white/10 bg-background/20 px-2 py-1 text-label-sm text-on-surface-variant">
          {sessions.length} active
        </span>
      </div>
      <div className="grid gap-2">
        {sessions.map((session) => {
          const displayState = resolveRecoverableUploadDisplayState({
            ...session,
            activeState: progressByUploadId[session.id] ?? null,
            resumableUntil: session.resumableUntil
              ? formatDateTime(session.resumableUntil)
              : null,
          });

          return (
            <article
              className="grid gap-2 rounded-sm border border-secondary-fixed-dim/25 bg-background/18 p-2"
              key={session.id}
            >
              <p className="truncate text-label-sm font-semibold text-on-surface">
                {session.fileName}
              </p>
              <MediaProcessingStatus
                compact
                onPrimaryAction={() => onResumeUpload(session)}
                onSecondaryAction={() => onCancelUpload(session)}
                state={displayState}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}
