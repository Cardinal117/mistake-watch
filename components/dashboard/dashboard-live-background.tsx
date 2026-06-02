"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

export function DashboardLiveBackground() {
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = backgroundRef.current;

    if (!node) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updateParallax = () => {
      frame = 0;

      if (reduceMotion.matches) {
        node.style.setProperty("--dashboard-parallax", "0px");
        return;
      }

      const offset = Math.min(window.scrollY * 0.18, 180);
      node.style.setProperty("--dashboard-parallax", `${offset.toFixed(2)}px`);
    };

    const scheduleParallax = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener("scroll", scheduleParallax, { passive: true });
    reduceMotion.addEventListener("change", updateParallax);

    return () => {
      window.removeEventListener("scroll", scheduleParallax);
      reduceMotion.removeEventListener("change", updateParallax);

      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  return (
    <div
      aria-hidden
      className="dashboard-live-bg"
      ref={backgroundRef}
      style={{ "--dashboard-parallax": "0px" } as CSSProperties}
    >
      <div className="dashboard-live-bg__filter" />
      <div className="dashboard-live-bg__depth" />
      <div className="dashboard-live-bg__haze dashboard-live-bg__haze--cyan" />
      <div className="dashboard-live-bg__haze dashboard-live-bg__haze--amber" />
      <div className="dashboard-live-bg__grid" />
      <div className="dashboard-live-bg__scan" />
      <div className="dashboard-live-bg__vignette" />
    </div>
  );
}
