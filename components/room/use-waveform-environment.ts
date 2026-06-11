"use client";

import { useEffect, useState } from "react";
import type { WaveformResolveEnvironment } from "@/lib/player";

export function useWaveformEnvironment(): WaveformResolveEnvironment {
  const [environment, setEnvironment] = useState<WaveformResolveEnvironment>({
    allowLiveAnalysis: false,
    mobileConstrained: false,
    reducedMotion: false,
  });

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const mobileQuery = window.matchMedia("(max-width: 767px)");

    function updateEnvironment() {
      setEnvironment({
        allowLiveAnalysis: false,
        mobileConstrained: mobileQuery.matches,
        reducedMotion: reducedMotionQuery.matches,
      });
    }

    updateEnvironment();
    reducedMotionQuery.addEventListener("change", updateEnvironment);
    mobileQuery.addEventListener("change", updateEnvironment);

    return () => {
      reducedMotionQuery.removeEventListener("change", updateEnvironment);
      mobileQuery.removeEventListener("change", updateEnvironment);
    };
  }, []);

  return environment;
}
