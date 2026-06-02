"use client";

import { useEffect } from "react";

import { completeRoomTransition } from "@/lib/performance/room-transition";

export function DashboardTransitionComplete() {
  useEffect(() => {
    completeRoomTransition("Dashboard ready");
  }, []);

  return null;
}
