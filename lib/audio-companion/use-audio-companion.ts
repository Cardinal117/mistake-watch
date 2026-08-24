"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  createAudioCompanionClient,
  type AudioCompanionSnapshot,
} from "./client";

const serverSnapshot: AudioCompanionSnapshot = Object.freeze({
  hasVisualDetail: false,
  rhythm: null,
  status: "unavailable",
});
const client = createAudioCompanionClient();
let connectionConsumers = 0;

export function useAudioCompanion() {
  const snapshot = useSyncExternalStore(
    client.subscribeState,
    client.getSnapshot,
    () => serverSnapshot,
  );

  useEffect(() => {
    connectionConsumers += 1;
    if (connectionConsumers === 1) client.connect();
    return () => {
      connectionConsumers = Math.max(0, connectionConsumers - 1);
      if (connectionConsumers === 0) client.disconnect();
    };
  }, []);

  return { client, snapshot };
}
