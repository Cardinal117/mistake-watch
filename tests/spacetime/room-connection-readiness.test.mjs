import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS,
  beginRoomConnectionAttempt,
  getFailedRoomConnectionReadiness,
  getRoomConnectionPresentation,
} from "../../lib/spacetime/live-room/connection-readiness.ts";

test("fresh room stays connecting until the active connection callback arrives", () => {
  const states = [];
  let callbacks;
  const inactiveHandle = {
    disconnect() {},
    get reducers() {
      throw new Error("inactive connection reducers were accessed");
    },
  };
  let activeConnection;

  const handle = beginRoomConnectionAttempt({
    connect(events) {
      callbacks = events;
      return inactiveHandle;
    },
    onConnect(connection) {
      activeConnection = connection;
    },
    onConnectError() {},
    onDisconnect() {},
    onReadiness(state) {
      states.push(state);
    },
  });

  assert.equal(handle, inactiveHandle);
  assert.deepEqual(states, [{ status: "connecting" }]);
  assert.equal(activeConnection, undefined);

  const connected = { reducers: { joinRoom() {} } };
  callbacks.onConnect(connected);

  assert.equal(activeConnection, connected);
  assert.deepEqual(states, [{ status: "connecting" }, { status: "ready" }]);
});

test("retryable failures become terminal only after the bounded attempt count", () => {
  const retrying = getFailedRoomConnectionReadiness(
    MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS - 1,
    "Live room connection failed. Retrying...",
  );
  const terminal = getFailedRoomConnectionReadiness(
    MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS,
    "Live room connection failed. Retrying...",
  );

  assert.deepEqual(retrying, {
    attempt: MAX_AUTOMATIC_ROOM_CONNECTION_ATTEMPTS - 1,
    message: "Live room connection failed. Retrying...",
    status: "retrying",
  });
  assert.equal(getRoomConnectionPresentation(retrying).canRetry, false);
  assert.deepEqual(terminal, {
    message: "Live room connection failed. Retrying...",
    status: "error",
  });
  assert.deepEqual(getRoomConnectionPresentation(terminal), {
    canRetry: true,
    detail: "Live room connection failed. Retrying...",
    label: "Live room unavailable",
  });
});
