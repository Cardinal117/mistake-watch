"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  createAudioCompanionClient,
  type AudioCompanionSnapshot,
} from "./client";

const serverSnapshot: AudioCompanionSnapshot = Object.freeze({
  rhythm: null,
  status: "unavailable",
});
const client = createAudioCompanionClient();

export function useAudioCompanion() {
  const snapshot = useSyncExternalStore(
    client.subscribeState,
    client.getSnapshot,
    () => serverSnapshot,
  );

  useEffect(() => {
    client.connect();
    return () => client.disconnect();
  }, []);

  return { client, snapshot };
}
