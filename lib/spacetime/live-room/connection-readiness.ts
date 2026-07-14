export const MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS = 3;

export type RoomConnectionReadiness =
  | { status: "connecting" }
  | { attempt: number; message: string; status: "retrying" }
  | { status: "ready" }
  | { message: string; status: "error" };

export type RoomConnectionPresentation = {
  canRetry: boolean;
  detail: string;
  label: string;
};

type ConnectionAttemptEvents<Connected> = {
  onConnect(connected: Connected): void;
  onConnectError(): void;
  onDisconnect(): void;
};

export function beginRoomConnectionAttempt<Handle, Connected>({
  connect,
  onConnect,
  onConnectError,
  onDisconnect,
  onReadiness,
}: {
  connect(events: ConnectionAttemptEvents<Connected>): Handle;
  onConnect(connected: Connected): void;
  onConnectError(): void;
  onDisconnect(): void;
  onReadiness(readiness: RoomConnectionReadiness): void;
}) {
  onReadiness({ status: "connecting" });

  return connect({
    onConnect(connected) {
      onReadiness({ status: "ready" });
      onConnect(connected);
    },
    onConnectError,
    onDisconnect,
  });
}

export function getFailedRoomConnectionReadiness(
  attempt: number,
  message: string,
): RoomConnectionReadiness {
  if (attempt >= MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS) {
    return { message, status: "error" };
  }

  return { attempt, message, status: "retrying" };
}

export function getRoomConnectionPresentation(
  readiness: Exclude<RoomConnectionReadiness, { status: "ready" }>,
): RoomConnectionPresentation {
  if (readiness.status === "connecting") {
    return {
      canRetry: false,
      detail: "Preparing synchronized room state.",
      label: "Connecting live room",
    };
  }

  return {
    canRetry: readiness.status === "error",
    detail: readiness.message,
    label:
      readiness.status === "error"
        ? "Live room unavailable"
        : "Retrying live connection",
  };
}
