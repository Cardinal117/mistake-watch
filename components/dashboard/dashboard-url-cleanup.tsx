"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type DashboardUrlCleanupProps = {
  enabled?: boolean;
};

export function DashboardUrlCleanup({ enabled }: DashboardUrlCleanupProps) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    router.replace("/", { scroll: false });
  }, [enabled, router]);

  return null;
}
