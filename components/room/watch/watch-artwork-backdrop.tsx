"use client";
import { useState } from "react";

/** Decorative provider artwork only; failure leaves the room palette visible. */
export function WatchArtworkBackdrop({
  src,
}: {
  src: string | null | undefined;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || src === failedSource) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Existing provider thumbnail, decorative blurred background only.
    <img
      className="watch-ambient-artwork"
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailedSource(src)}
    />
  );
}
