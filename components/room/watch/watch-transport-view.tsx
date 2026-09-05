"use client";
import { useRef } from "react";
import {
  Maximize2,
  Minimize2,
  VolumeX,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useWatchFullscreenControls } from "./use-watch-fullscreen";
import { formatDuration } from "./presentation";

type Props = {
  title: string;
  awaitingMedia: boolean;
  canControl: boolean;
  currentPosition: number;
  durationSeconds: number;
  playing: boolean;
  previous: boolean;
  next: boolean;
  volume: number;
  autoplay: boolean;
  onPlayback(): void;
  onSeek(value: number): void;
  onRelative(value: number): void;
  onPrevious(): void;
  onNext(): void;
  onVolume(value: number): void;
  onAutoplay(): void;
};
export function WatchTransportView(p: Props) {
  const fullscreen = useWatchFullscreenControls();
  const unmutedVolume = useRef(72);
  function mute() {
    if (p.volume > 0) {
      unmutedVolume.current = p.volume;
      p.onVolume(0);
    } else p.onVolume(unmutedVolume.current);
  }
  function seekBy(seconds: number) {
    const target = Math.max(
      0,
      Math.min(p.durationSeconds || Infinity, p.currentPosition + seconds),
    );
    p.onRelative(target - p.currentPosition);
  }
  return (
    <section className="watch-transport" aria-label="Playback controls">
      <div className="watch-transport-title">
        <h2>{p.awaitingMedia ? "Choose something to watch" : p.title}</h2>
      </div>
      <div className="watch-seek">
        <Slider
          label="Playback position"
          tone="dynamic"
          min={0}
          max={p.durationSeconds || 1}
          step={1}
          value={Math.min(p.durationSeconds || 0, p.currentPosition)}
          disabled={!p.canControl || p.awaitingMedia || !p.durationSeconds}
          onChange={(e) => p.onSeek(Number(e.currentTarget.value))}
          aria-valuetext={formatDuration(p.currentPosition)}
        />
      </div>
      <div className="watch-time">
        <span>{formatDuration(p.currentPosition)}</span>
        <span>
          {p.durationSeconds
            ? formatDuration(p.durationSeconds)
            : "Duration unavailable"}
        </span>
      </div>
      <div className="watch-transport-primary">
        <button
          aria-label="Previous queue item"
          disabled={!p.canControl || !p.previous}
          onClick={p.onPrevious}
        >
          <SkipBack />
        </button>
        {fullscreen.active && (
          <button
            aria-label="Back 30 seconds"
            disabled={!p.canControl || p.awaitingMedia}
            onClick={() => seekBy(-30)}
          >
            <RotateCcw />
            <small>30</small>
          </button>
        )}
        <button
          aria-label="Back 10 seconds"
          disabled={!p.canControl || p.awaitingMedia}
          onClick={() => seekBy(-10)}
        >
          <RotateCcw />
          <small>10</small>
        </button>
        <button
          className="watch-play"
          aria-label={p.playing ? "Pause" : "Play"}
          disabled={!p.canControl || p.awaitingMedia}
          onClick={p.onPlayback}
        >
          {p.playing ? <Pause /> : <Play />}
        </button>
        <button
          aria-label="Forward 10 seconds"
          disabled={!p.canControl || p.awaitingMedia}
          onClick={() => seekBy(10)}
        >
          <RotateCw />
          <small>10</small>
        </button>
        {fullscreen.active && (
          <button
            aria-label="Forward 30 seconds"
            disabled={!p.canControl || p.awaitingMedia}
            onClick={() => seekBy(30)}
          >
            <RotateCw />
            <small>30</small>
          </button>
        )}
        <button
          aria-label="Next queue item"
          disabled={!p.canControl || !p.next}
          onClick={p.onNext}
        >
          <SkipForward />
        </button>
      </div>
      <div className="watch-transport-secondary">
        <div className="watch-volume">
          <button
            className="watch-mute"
            aria-label={p.volume > 0 ? "Mute" : "Unmute"}
            onClick={mute}
          >
            {p.volume > 0 ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
          </button>
          <Slider
            label="Volume"
            tone="dynamic"
            min={0}
            max={100}
            value={p.volume}
            onChange={(e) => p.onVolume(Number(e.currentTarget.value))}
          />
          <span className="watch-volume-value">{Math.round(p.volume)}%</span>
        </div>
        <button
          aria-label={
            p.autoplay ? "Disable queue autoplay" : "Enable queue autoplay"
          }
          aria-pressed={p.autoplay}
          disabled={!p.canControl}
          onClick={p.onAutoplay}
        >
          <Repeat2 />
        </button>
        <button
          aria-label={
            fullscreen.active ? "Exit fullscreen" : "Fullscreen video"
          }
          disabled={p.awaitingMedia}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? <Minimize2 /> : <Maximize2 />}
        </button>
      </div>
      {!p.canControl && (
        <p className="watch-permission">
          Playback is controlled by the room host.
        </p>
      )}
    </section>
  );
}
