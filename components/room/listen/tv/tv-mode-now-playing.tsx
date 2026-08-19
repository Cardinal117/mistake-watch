"use client";

import type { RoomQueueItem } from "@/lib/rooms";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { PreferenceHeartButton } from "@/components/room/listen/preference-heart-button";
import { YouTubeMetadataLine } from "@/components/room/youtube-metadata-line";

export function ListenTvNowPlayingDetails({
  artist,
  mediaPreferences,
  preferenceItem,
  sourceUrl,
  title,
  youtubeSource,
}: {
  artist: string;
  mediaPreferences: MediaPreferenceController;
  preferenceItem: RoomQueueItem | null;
  sourceUrl: string | null;
  title: string;
  youtubeSource: boolean;
}) {
  return (
    <div className="grid max-w-[min(46rem,58vw)] gap-3 transition-opacity duration-500 motion-reduce:transition-none">
      <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
        Now playing
      </p>
      <div className="flex items-start gap-3">
        <h1
          className="min-w-0 flex-1 text-[clamp(1.75rem,2.65vw,3.1rem)] font-semibold leading-[1.06] tracking-normal drop-shadow-[0_6px_28px_rgb(0_0_0_/_0.55)] [overflow-wrap:anywhere] [text-shadow:0_0_30px_rgb(var(--listen-shadow)_/_0.24)]"
          style={{
            color:
              "color-mix(in srgb, rgb(var(--listen-primary)) 14%, rgb(229 226 227))",
          }}
        >
          {title}
        </h1>
        {preferenceItem ? (
          <PreferenceHeartButton
            className="mt-0.5 h-12 w-12 rounded-md bg-black/36 shadow-[0_0_24px_rgb(0_0_0_/_0.28)] backdrop-blur-xl"
            item={preferenceItem}
            onToggle={() =>
              void mediaPreferences.togglePreference(preferenceItem)
            }
            preference={mediaPreferences.getPreference(preferenceItem)}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-title-md text-on-surface-variant">
        <span>{artist}</span>
        {youtubeSource && sourceUrl ? (
          <YouTubeMetadataLine
            className="[&>span]:border-white/8 [&>span]:bg-black/24 [&>span]:backdrop-blur-md"
            compact
            showChannel={false}
            sourceUrl={sourceUrl}
            tone="dynamic"
          />
        ) : null}
      </div>
    </div>
  );
}
