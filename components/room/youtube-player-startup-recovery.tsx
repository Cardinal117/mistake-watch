"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  youtubePlayerStartupRecovery,
  YouTubePlayerStartupGuard,
} from "@/lib/youtube/player-lifecycle";

type YouTubePlayerStartupRecoveryOptions = {
  clearPlayerError(): void;
  getRecoveryKey(): string | null;
};

export function useYouTubePlayerStartupRecovery({
  clearPlayerError,
  getRecoveryKey,
}: YouTubePlayerStartupRecoveryOptions) {
  const [startupFailed, setStartupFailed] = useState(false);
  const [playerGeneration, setPlayerGeneration] = useState(0);

  const armStartupGuard = useCallback(
    (recoveryKey: string | null) => {
      const guard = new YouTubePlayerStartupGuard();

      guard.arm(() => {
        clearPlayerError();

        if (
          recoveryKey &&
          youtubePlayerStartupRecovery.reserveAutomatic(recoveryKey)
        ) {
          setStartupFailed(false);
          setPlayerGeneration((generation) => generation + 1);
          return;
        }

        setStartupFailed(true);
      });
      return guard;
    },
    [clearPlayerError],
  );

  const markStartupReady = useCallback(() => {
    setStartupFailed(false);
  }, []);

  const reloadYouTubePlayer = useCallback(() => {
    const recoveryKey = getRecoveryKey();

    if (
      !recoveryKey ||
      !youtubePlayerStartupRecovery.reserveManual(recoveryKey)
    ) {
      return;
    }

    clearPlayerError();
    setStartupFailed(false);
    setPlayerGeneration((generation) => generation + 1);
  }, [clearPlayerError, getRecoveryKey]);

  return {
    armStartupGuard,
    markStartupReady,
    playerGeneration,
    reloadYouTubePlayer,
    startupFailed,
  };
}

export function YouTubePlayerAlerts({
  autoplayBlocked,
  localError,
  onReload,
  onResume,
  startupFailed,
}: {
  autoplayBlocked: boolean;
  localError: string | null;
  onReload(): void;
  onResume(): void;
  startupFailed: boolean;
}) {
  return (
    <>
      {autoplayBlocked ? (
        <button
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-sm rounded-sm border border-primary-fixed-dim/35 bg-surface/92 px-4 py-3 text-body-md font-semibold text-primary-fixed-dim backdrop-blur-xl"
          onClick={onResume}
          type="button"
        >
          Resume playback
        </button>
      ) : null}
      {startupFailed ? (
        <div
          className="absolute inset-x-4 bottom-28 z-20 mx-auto flex max-w-md items-center justify-between gap-4 rounded-md border border-error/35 bg-surface/90 px-4 py-3 text-body-md text-error backdrop-blur-xl"
          role="alert"
        >
          <span>YouTube player failed to initialize.</span>
          <button
            className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-error/45 px-3 py-2 font-semibold text-error transition-colors hover:bg-error/10"
            onClick={onReload}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reload player
          </button>
        </div>
      ) : localError ? (
        <p
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-md rounded-md border border-error/35 bg-surface/90 px-4 py-3 text-body-md text-error backdrop-blur-xl"
          role="alert"
        >
          {localError}
        </p>
      ) : null}
    </>
  );
}
