"use client";

import { Eye, ThumbsUp } from "lucide-react";

import { formatCompactCount } from "@/lib/youtube/format";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { cx } from "@/lib/ui";

type YouTubeMetadataLineProps = {
  className?: string;
  compact?: boolean;
  sourceUrl?: string | null;
  tone?: "amber" | "cyan";
};

export function YouTubeMetadataLine({
  className,
  compact = false,
  sourceUrl,
  tone = "cyan",
}: YouTubeMetadataLineProps) {
  const { loading, metadata, reason, status, videoId } =
    useYouTubeMetadata(sourceUrl);

  if (!videoId) {
    return null;
  }

  const accent =
    tone === "amber" ? "text-secondary-fixed-dim" : "text-primary-fixed-dim";
  const viewCount = formatCompactCount(metadata?.viewCount);
  const likeCount = formatCompactCount(metadata?.likeCount);

  if (loading && !metadata) {
    return (
      <p
        className={cx(
          "technical-label text-on-surface-variant",
          compact && "text-[11px]",
          className,
        )}
      >
        Metadata pending
      </p>
    );
  }

  if (status !== "available" || !metadata) {
    return (
      <p
        className={cx(
          "technical-label text-on-surface-variant",
          compact && "text-[11px]",
          className,
        )}
        title={reason}
      >
        Metadata unavailable
      </p>
    );
  }

  return (
    <div
      className={cx(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-label-sm text-on-surface-variant",
        compact && "gap-x-2 text-[11px] leading-4",
        className,
      )}
    >
      {metadata.channelTitle ? (
        <span className="min-w-0 truncate">{metadata.channelTitle}</span>
      ) : null}
      <span className="inline-flex items-center gap-1" title="Views">
        <Eye className={cx("h-3.5 w-3.5", accent)} aria-hidden />
        {viewCount ? `${viewCount} views` : "Views unavailable"}
      </span>
      <span className="inline-flex items-center gap-1" title="Likes">
        <ThumbsUp className={cx("h-3.5 w-3.5", accent)} aria-hidden />
        {likeCount ? `${likeCount} likes` : "Likes unavailable"}
      </span>
    </div>
  );
}
