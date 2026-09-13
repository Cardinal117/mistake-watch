"use client";
import { useLayoutEffect, useEffect, useState } from "react";
import { ListenModeTabs } from "@/components/room/listen/header/header-tools";
import { useRoomTransitions } from "@/components/ui/room-loading/provider";
import { useRoomShellReady } from "@/components/ui/room-loading/hooks";
import { BrandLockup } from "@/components/brand";
import type { RoomMode } from "@/lib/room-transition/store";
declare global {
  interface Window {
    loadingQA: {
      behavior(value: string): void;
      confirm(mode: RoomMode): void;
      ready(value: boolean): void;
      mounted(value: boolean): void;
      remote(mode: RoomMode): void;
      reconnect(): void;
      theme(): void;
      fail(): void;
    };
  }
}
function Shell({ mode, epoch }: { mode: RoomMode; epoch: number }) {
  useRoomShellReady("fixture", mode, epoch);
  return (
    <>
      <BrandLockup mode={mode} />
      <h1>{mode} room</h1>
    </>
  );
}
export function RoomLoadingFixture() {
  const store = useRoomTransitions();
  const [mode, setMode] = useState<RoomMode>("listen");
  const [confirmed, setConfirmed] = useState<RoomMode>("listen");
  const [ready, setReady] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [epoch, setEpoch] = useState(1);
  const [mounted, setMounted] = useState(true);
  const [behavior, setBehavior] = useState("normal");
  useLayoutEffect(() => {
    store?.observe({
      roomId: "fixture",
      epoch,
      mode: confirmed,
      ready,
      error,
      retry: () => {
        setError(undefined);
        setEpoch((x) => x + 1);
        setReady(false);
      },
    });
  }, [store, confirmed, ready, epoch, error]);
  useEffect(() => {
    window.loadingQA = {
      behavior: setBehavior,
      confirm: setConfirmed,
      ready: setReady,
      mounted: setMounted,
      remote(next) {
        setMode(next);
        setConfirmed(next);
      },
      reconnect() {
        setEpoch((x) => x + 1);
        setReady(false);
      },
      theme() {
        store?.theme("fixture", {
          primary: "255 60 100",
          secondary: "90 200 255",
          background: "16 10 14",
        });
      },
      fail() {
        setReady(false);
        setError("Admission failed. Please retry.");
      },
    };
    return () => store?.leave("fixture");
  }, [store]);
  return (
    <main style={{ padding: 24 }} data-mode={mode}>
      <ListenModeTabs
        key={mode}
        canSwitch
        mode={mode}
        onSwitchMode={async (next) => {
          setMode(next);
          if (behavior === "reject") {
            await new Promise((r) => setTimeout(r, 300));
            setMode(confirmed);
            throw Error("Mode permission denied.");
          }
          if (behavior === "slow-shell") setMounted(false);
          if (behavior !== "unconfirmed")
            setTimeout(() => setConfirmed(next), 900);
          await new Promise((r) => setTimeout(r, 1200));
        }}
      />
      {mounted && <Shell mode={mode} epoch={epoch} />}
      <button onClick={() => store?.cancel()}>Room action</button>
    </main>
  );
}
