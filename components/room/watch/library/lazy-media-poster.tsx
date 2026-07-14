"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export function LazyMediaPoster({
  alt = "",
  className = "h-full w-full object-cover opacity-90",
  eager = false,
  scrollRootRef,
  src,
}: {
  alt?: string;
  className?: string;
  eager?: boolean;
  scrollRootRef?: RefObject<HTMLDivElement | null>;
  src: string;
}) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(() =>
    eager ? src : null,
  );
  const shouldLoad = eager || loadedSource === src;

  useEffect(() => {
    const container = containerRef.current;

    if (shouldLoad || !container) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setLoadedSource(src));
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setLoadedSource(src);
          observer.disconnect();
        }
      },
      {
        root: scrollRootRef?.current ?? null,
        rootMargin: "360px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [scrollRootRef, shouldLoad, src]);

  return (
    <span className="block h-full w-full" ref={containerRef}>
      {shouldLoad ? (
        // eslint-disable-next-line @next/next/no-img-element -- Private posters resolve through an authorized app route only near the viewport.
        <img
          alt={alt}
          className={className}
          decoding="async"
          fetchPriority={eager ? "auto" : "low"}
          loading={eager ? "eager" : "lazy"}
          src={src}
        />
      ) : null}
    </span>
  );
}
