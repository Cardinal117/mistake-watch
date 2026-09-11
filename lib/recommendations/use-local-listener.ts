"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { LiveRoomState } from "@/lib/spacetime";

/** Direct/HLS element evidence only. The YouTube API player never mounts this observer. */
export function useLocalListener(
  mediaRef: RefObject<HTMLMediaElement | null>,
  liveRoom: LiveRoomState,
) {
  const latest = useRef(liveRoom);
  useEffect(() => {
    latest.current = liveRoom;
  });
  const connection = liveRoom.listenerConnection;
  const admissionId = connection?.admissionId;
  const identityHex = connection?.identityHex;
  const roomId = connection?.roomId;
  const sourceType = liveRoom.snapshot.session?.sourceType;
  const sourceUrl = liveRoom.snapshot.session?.sourceUrl;
  useEffect(() => {
    const media = mediaRef.current;
    if (
      !media ||
      !admissionId ||
      !identityHex ||
      !roomId ||
      !["direct", "hls"].includes(sourceType ?? "")
    )
      return;
    let disposed = false;
    let expiresAt = 0;
    let sequence = BigInt(Date.now()) * BigInt(1000);
    let renewing = false;
    let renewalVersion = 0;
    let refreshAgain = false;
    let buffering = media.readyState < HTMLMediaElement.HAVE_FUTURE_DATA;
    function report() {
      if (disposed || Date.now() >= expiresAt) return;
      const current = latest.current;
      const occurrenceId = current.snapshot.session?.playbackOccurrenceId;
      if (
        !occurrenceId ||
        current.connectionStatus !== "connected" ||
        current.snapshot.session?.sourceUrl !== sourceUrl
      )
        return;
      current.observeListenerPlayback?.({
        occurrenceId,
        sequence: ++sequence,
        positionSeconds: media!.currentTime,
        playing: !media!.paused && !media!.ended,
        buffering: buffering || media!.seeking || media!.readyState < 3,
        muted: media!.muted,
        volume: media!.volume,
      });
    }
    async function renew() {
      if (renewing || disposed) return;
      renewing = true;
      const version = renewalVersion;
      try {
        const response = await fetch("/api/recommendations/listening/grant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ admissionId, identityHex, roomId }),
          signal: AbortSignal.timeout(10000),
        });
        const body = await response.json();
        if (!disposed && version === renewalVersion) {
          expiresAt =
            response.ok && body.allowed && Number.isFinite(body.expiresAt)
              ? body.expiresAt
              : 0;
          report();
        }
      } catch {
        expiresAt = 0;
      } finally {
        renewing = false;
        if (refreshAgain && !disposed) {
          refreshAgain = false;
          void renew();
        }
      }
    }
    function changed(event: Event) {
      if (
        ["waiting", "stalled", "seeking", "emptied", "error"].includes(
          event.type,
        )
      )
        buffering = true;
      if (["playing", "canplay", "seeked"].includes(event.type))
        buffering = false;
      report();
    }
    function permissionChanged() {
      expiresAt = 0;
      renewalVersion += 1;
      if (renewing) refreshAgain = true;
      else void renew();
    }
    const events = [
      "playing",
      "pause",
      "waiting",
      "stalled",
      "seeking",
      "seeked",
      "canplay",
      "ended",
      "volumechange",
      "emptied",
      "error",
    ];
    events.forEach((event) => media.addEventListener(event, changed));
    window.addEventListener("mw-listening-settings-changed", permissionChanged);
    const observer = setInterval(report, 5000);
    const renewal = setInterval(() => void renew(), 60000);
    void renew();
    return () => {
      disposed = true;
      clearInterval(observer);
      clearInterval(renewal);
      events.forEach((event) => media.removeEventListener(event, changed));
      window.removeEventListener(
        "mw-listening-settings-changed",
        permissionChanged,
      );
    };
  }, [admissionId, identityHex, roomId, sourceType, sourceUrl, mediaRef]);
}
