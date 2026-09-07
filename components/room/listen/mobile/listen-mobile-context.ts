"use client";
import { createContext } from "react";
export const ListenMobilePresentation = createContext(false);
export const ListenMobileQueueNavigation = createContext<(() => void) | null>(
  null,
);

export const ListenMobileStage = createContext<{
  view: "discover" | "visualizer";
  select(view: "discover" | "visualizer"): void;
} | null>(null);
