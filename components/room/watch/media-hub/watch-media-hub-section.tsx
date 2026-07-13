"use client";

import type { ReactNode } from "react";

import type {
  LoadSourceInput,
  QueueItemInput,
  WatchMediaHubItem,
} from "../contracts";
import { WatchMediaHubCard } from "../library/watch-media-hub-card";

export type WatchMediaHubSectionConfig =
  | {
      comingSoon?: false;
      icon: ReactNode;
      items: WatchMediaHubItem[];
      label: string;
      note: string;
    }
  | {
      comingSoon: true;
      icon: ReactNode;
      label: string;
      note: string;
    };

export function WatchMediaHubSection({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  onAddQueueItem,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  roomId,
  section,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  onAddQueueItem?(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPlayNext?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  roomId: string;
  section: WatchMediaHubSectionConfig;
}) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2">
        <span className="text-primary-fixed-dim">{section.icon}</span>
        <p className="technical-label text-on-surface">{section.label}</p>
      </div>
      {"comingSoon" in section && section.comingSoon ? (
        <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
          Coming soon
        </div>
      ) : section.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {section.items.map((item) => (
            <WatchMediaHubCard
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              canManageQueue={canManageQueue}
              item={item}
              key={`${section.label}-${item.id}`}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              onPlayNext={onPlayNext}
              onPlayQueueItem={onPlayQueueItem}
              roomId={roomId}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
          No items yet
        </div>
      )}
      <p className="text-label-sm text-on-surface-variant">{section.note}</p>
    </section>
  );
}
