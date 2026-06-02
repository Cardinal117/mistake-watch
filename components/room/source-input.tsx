"use client";

import { useState, type FormEvent } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { validateMediaSourceForMode } from "@/lib/player/source";

type SourceInputProps = {
  canLoadSource: boolean;
  connectionStatus?: string;
  mode: "listen" | "watch";
  onLoadSource(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
};

export function SourceInput({
  canLoadSource,
  connectionStatus,
  mode,
  onLoadSource,
}: SourceInputProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const result = validateMediaSourceForMode(sourceUrl, mode);

    if (!result.valid) {
      setErrorMessage(result.message);
      return;
    }

    setPending(true);
    try {
      onLoadSource({
        sourceTitle: result.title,
        sourceType: result.kind,
        sourceUrl: result.url,
      });
      setSourceUrl("");
    } catch {
      setErrorMessage("The source could not be sent to the live room.");
    }
    window.setTimeout(() => setPending(false), 500);
  }

  return (
    <form
      className="grid gap-2 rounded-lg border border-white/10 bg-surface/85 p-3 shadow-cyan-glow backdrop-blur-xl"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Input
          disabled={!canLoadSource}
          label={mode === "listen" ? "Audio or YouTube URL" : "Video URL"}
          name="source-url"
          onChange={(event) => setSourceUrl(event.target.value)}
          placeholder={
            mode === "watch"
              ? "https://youtube.com/watch?v=..."
              : "https://music.youtube.com/watch?v=..."
          }
          value={sourceUrl}
        />
        <Button disabled={!canLoadSource || pending} type="submit">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Link2 className="h-4 w-4" aria-hidden />
          )}
          Load
        </Button>
      </div>
      <p className="text-label-sm text-on-surface-variant">
        {canLoadSource
          ? mode === "watch"
            ? "Paste a direct video, HLS stream, or YouTube link."
            : "Paste a YouTube, YouTube Music, direct audio, or HLS audio URL."
          : connectionStatus === "connected"
            ? "Only the host can load a new media source right now."
            : "Connect to the live room before loading media."}
      </p>
      {errorMessage ? (
        <p className="text-label-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
