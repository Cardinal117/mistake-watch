"use client";

import { Eye, ThumbsUp } from "lucide-react";

import { MetadataPlaceholderChips } from "@/components/room/metadata-placeholder-chips";
import { formatCompactCount } from "@/lib/youtube/format";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";

type DashboardYouTubeMetadataProps = {
  sourceUrl?: string;
};

export function DashboardYouTubeMetadata({
  sourceUrl,
}: DashboardYouTubeMetadataProps) {
  const { loading, metadata, status, videoId } = useYouTubeMetadata(sourceUrl);

  if (!videoId) {
    return null;
  }

  if (loading && !metadata) {
    return <MetadataPlaceholderChips compact />;
  }

  if (status !== "available" || !metadata) {
    return (
      <p className="technical-label text-on-surface-variant">
        Metadata unavailable
      </p>
    );
  }

  const views = formatCompactCount(metadata.viewCount);
  const likes = formatCompactCount(metadata.likeCount);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant">
      {metadata.channelTitle ? (
        <span className="min-w-0 truncate">{metadata.channelTitle}</span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        {views ? `${views} views` : "Views unavailable"}
      </span>
      <span className="inline-flex items-center gap-1">
        <ThumbsUp className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        {likes ? `${likes} likes` : "Likes unavailable"}
      </span>
    </div>
  );
}
