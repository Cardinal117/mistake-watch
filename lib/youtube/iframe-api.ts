"use client";

export type YoutubePlayer = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  getVideoData(): {
    title?: string;
  };
  cueVideoById(videoId: string, startSeconds?: number): void;
  loadVideoById(videoId: string, startSeconds?: number): void;
  mute(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  unMute(): void;
};

export type YoutubePlayerEvent = {
  data: number;
  target: YoutubePlayer;
};

export type YoutubePlayerConstructor = new (
  elementId: string,
  options: {
    events: {
      onAutoplayBlocked?: () => void;
      onError?: () => void;
      onReady?: () => void;
      onStateChange?: (event: YoutubePlayerEvent) => void;
    };
    height: string;
    playerVars: Record<string, number | string>;
    videoId: string;
    width: string;
  },
) => YoutubePlayer;

export type YoutubeNamespace = {
  Player: YoutubePlayerConstructor;
  PlayerState: {
    BUFFERING: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YoutubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YoutubeNamespace> | null = null;

export function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  youtubeApiPromise ??= new Promise<YoutubeNamespace>((resolve, reject) => {
    const existingReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      existingReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube API loaded without a player."));
      }
    };

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");

      script.async = true;
      script.onerror = () => reject(new Error("YouTube API failed to load."));
      script.src = "https://www.youtube.com/iframe_api";
      document.head.append(script);
    }
  });

  return youtubeApiPromise;
}
