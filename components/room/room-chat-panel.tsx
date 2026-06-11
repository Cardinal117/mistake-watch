"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { RefreshCw, Send, WifiOff } from "lucide-react";

import { Avatar, Badge, Button } from "@/components/ui";
import type { RoomParticipant } from "@/lib/rooms";
import type { SpacetimeConnectionStatus } from "@/lib/spacetime";
import type { LiveChatMessage } from "@/lib/spacetime/types";
import { cx } from "@/lib/ui";

type RoomChatPanelProps = {
  connectionStatus: SpacetimeConnectionStatus;
  currentMemberId?: string;
  getMemberAccentColor?: (memberId: string) => string;
  messages: LiveChatMessage[];
  participants: RoomParticipant[];
  presentation?: "audience" | "default";
  sendMessage(input: { clientMessageId: string; text: string }): Promise<void>;
};

type PendingChatMessage = {
  clientMessageId: string;
  createdMs: number;
  status: "failed" | "sending";
  text: string;
};

type VisibleChatMessage = {
  avatarKey: string | null;
  clientMessageId: string;
  createdMs: number;
  displayName: string;
  isCurrentMember: boolean;
  isHost: boolean;
  memberId: string;
  status: "failed" | "sending" | "sent";
  text: string;
};

const sendTimeoutMs = 12_000;

export function RoomChatPanel({
  connectionStatus,
  currentMemberId,
  getMemberAccentColor,
  messages,
  participants,
  presentation = "default",
  sendMessage,
}: RoomChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [pendingMessages, setPendingMessages] = useState<
    PendingChatMessage[]
  >([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const currentParticipant = participants.find(
    (participant) => participant.id === currentMemberId,
  );
  const confirmedClientIds = useMemo(
    () => new Set(messages.map((message) => message.clientMessageId)),
    [messages],
  );
  const visibleMessages = useMemo<VisibleChatMessage[]>(() => {
    const confirmed = messages.map((message) => ({
      avatarKey: message.avatarKey,
      clientMessageId: message.clientMessageId,
      createdMs: message.createdMs,
      displayName: message.displayName,
      isCurrentMember: message.memberId === currentMemberId,
      isHost: message.isHost,
      memberId: message.memberId,
      status: "sent" as const,
      text: message.text,
    }));
    const pending = pendingMessages
      .filter((message) => !confirmedClientIds.has(message.clientMessageId))
      .map((message) => ({
        avatarKey: currentParticipant?.avatarKey ?? null,
        clientMessageId: message.clientMessageId,
        createdMs: message.createdMs,
        displayName: currentParticipant?.name ?? "You",
        isCurrentMember: true,
        isHost: currentParticipant?.role === "host",
        memberId: currentMemberId ?? "local",
        status: message.status,
        text: message.text,
      }));

    return [...confirmed, ...pending].sort(
      (a, b) => a.createdMs - b.createdMs,
    );
  }, [
    confirmedClientIds,
    currentMemberId,
    currentParticipant,
    messages,
    pendingMessages,
  ]);
  const audience = presentation === "audience";

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();

      setPendingMessages((current) =>
        current.map((message) =>
          message.status === "sending" &&
          now - message.createdMs > sendTimeoutMs
            ? { ...message, status: "failed" }
            : message,
        ),
      );
    }, 3_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
    });
  }, [visibleMessages.length]);

  async function sendPendingMessage(message: PendingChatMessage) {
    setPendingMessages((current) =>
      current.map((item) =>
        item.clientMessageId === message.clientMessageId
          ? { ...item, createdMs: Date.now(), status: "sending" }
          : item,
      ),
    );

    try {
      await sendMessage({
        clientMessageId: message.clientMessageId,
        text: message.text,
      });
    } catch {
      setPendingMessages((current) =>
        current.map((item) =>
          item.clientMessageId === message.clientMessageId
            ? { ...item, status: "failed" }
            : item,
        ),
      );
    }
  }

  async function submitDraft() {
    const text = draft.trim();

    if (!text) {
      return;
    }

    const message: PendingChatMessage = {
      clientMessageId: createClientMessageId(),
      createdMs: Date.now(),
      status: connectionStatus === "connected" ? "sending" : "failed",
      text,
    };

    setDraft("");
    setPendingMessages((current) => [...current, message]);

    if (connectionStatus === "connected") {
      await sendPendingMessage(message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitDraft();
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      void submitDraft();
    }
  }

  return (
    <div
      className={cx(
        "grid h-full min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4",
        audience
          ? "min-h-0 rounded-lg border border-white/10 bg-background/5 p-3 shadow-[inset_0_0_24px_rgb(0_219_233_/_0.045)] backdrop-blur-[3px] lg:rounded-r-none lg:border-r-0"
          : "min-h-[32rem]",
      )}
    >
      <div className={audience ? "min-w-0" : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Chat</Badge>
          <Badge tone={connectionStatus === "connected" ? "cyan" : "neutral"}>
            {connectionStatus}
          </Badge>
        </div>
        <h2
          className={cx(
            "mt-3 font-semibold text-on-surface",
            audience ? "text-body-lg" : "text-headline-md",
          )}
        >
          Room chat
        </h2>
        {connectionStatus !== "connected" ? (
          <p className="mt-2 inline-flex items-center gap-2 text-body-md text-on-surface-variant">
            <WifiOff className="h-4 w-4 text-secondary-fixed-dim" aria-hidden />
            Messages will fail until the room reconnects.
          </p>
        ) : null}
      </div>

      <div
        aria-live="polite"
        className={cx(
          "min-h-0 overflow-y-auto rounded-md border border-white/10 p-3",
          audience
            ? "bg-background/5 shadow-[inset_0_0_20px_rgb(229_226_227_/_0.02)] backdrop-blur-[2px] [scrollbar-color:rgb(0_219_233_/_0.32)_transparent] [scrollbar-width:thin]"
            : "bg-surface-container-low",
        )}
        ref={scrollRef}
      >
        {visibleMessages.length > 0 ? (
          <ol className={cx("grid", audience ? "gap-2" : "gap-3")}>
            {visibleMessages.map((message) => (
              <li
                className={cx(
                  audience
                    ? "grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-sm border border-white/10 bg-background/5 p-2 shadow-[inset_0_0_10px_rgb(255_255_255_/_0.014)]"
                    : "grid gap-2 rounded-md border p-3",
                  !audience &&
                    (message.isCurrentMember
                      ? "border-primary-fixed-dim/25 bg-primary-fixed-dim/10"
                      : "border-white/10 bg-surface-container"),
                )}
                key={message.clientMessageId}
                style={{
                  borderColor: message.isCurrentMember
                    ? undefined
                    : getMemberAccentColor
                      ? `${getMemberAccentColor(message.memberId)}55`
                      : undefined,
                }}
              >
                {audience ? (
                  <Avatar
                    avatarKey={message.avatarKey}
                    className="h-7 w-7 shrink-0"
                    crowned={message.isHost}
                    name={message.displayName}
                    seed={message.memberId}
                  />
                ) : null}
                {audience ? (
                  <div className="min-w-0 text-body-md leading-6">
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          getMemberAccentColor?.(message.memberId) ??
                          undefined,
                      }}
                    >
                      {message.isCurrentMember ? "You" : message.displayName}
                    </span>
                    <span className="text-on-surface-variant">: </span>
                    <span
                      className="font-semibold"
                      style={{
                        color:
                          getMemberAccentColor?.(message.memberId) ??
                          undefined,
                      }}
                    >
                      --_&gt;
                    </span>{" "}
                    <span className="break-words text-on-surface">
                      {message.text}
                    </span>
                    <span className="ml-2 whitespace-nowrap text-label-sm text-on-surface-variant">
                      {formatChatTime(message.createdMs)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        avatarKey={message.avatarKey}
                        className="h-8 w-8"
                        crowned={message.isHost}
                        name={message.displayName}
                        seed={message.memberId}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-semibold text-on-surface">
                          <span
                            style={{
                              color:
                                getMemberAccentColor?.(message.memberId) ??
                                undefined,
                            }}
                          >
                            {message.isCurrentMember
                              ? "You"
                              : message.displayName}
                          </span>
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          {message.isHost ? "host" : "guest"} -{" "}
                          {formatChatTime(message.createdMs)}
                        </p>
                      </div>
                      <span
                        className={cx(
                          "technical-label rounded-sm border px-2 py-1",
                          message.status === "sent" &&
                            "border-white/10 text-on-surface-variant",
                          message.status === "sending" &&
                            "border-primary-fixed-dim/35 text-primary-fixed-dim",
                          message.status === "failed" &&
                            "border-error/35 text-error",
                        )}
                      >
                        {message.status}
                      </span>
                    </div>
                    <p className="break-words text-body-md text-on-surface">
                      {message.text}
                    </p>
                  </>
                )}
                {message.status === "failed" ? (
                  <button
                    className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-error/35 px-2 py-1 text-label-sm font-semibold text-error transition hover:bg-error/10"
                    onClick={() =>
                      void sendPendingMessage({
                        clientMessageId: message.clientMessageId,
                        createdMs: Date.now(),
                        status: "sending",
                        text: message.text,
                      })
                    }
                    type="button"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    Retry
                  </button>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid h-full min-h-48 place-items-center rounded-md border border-dashed border-white/10 text-center">
            <p className="max-w-48 text-body-md text-on-surface-variant">
              No room messages yet.
            </p>
          </div>
        )}
      </div>

      <form className="grid gap-2" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="room-chat-message">
          Room message
        </label>
        <textarea
          className={cx(
            "min-h-24 resize-none rounded-md border border-white/10 px-3 py-2 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/60 focus:border-primary-fixed-dim/60 focus:ring-2 focus:ring-primary-fixed-dim/15",
            audience
              ? "bg-background/12 shadow-[inset_0_0_18px_rgb(0_219_233_/_0.035)] backdrop-blur-sm"
              : "bg-surface-container",
          )}
          id="room-chat-message"
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Message the room"
          value={draft}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-label-sm text-on-surface-variant">
            {draft.length}/500
          </span>
          <Button
            className="min-w-28"
            disabled={!draft.trim()}
            size="sm"
            type="submit"
          >
            <Send className="h-4 w-4" aria-hidden />
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatChatTime(createdMs: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdMs));
}
