import type { Page } from "@playwright/test";

declare global {
  interface Window {
    watchYouTubeFixture?: {
      triggerState(state: number): void;
      position: number;
      playCalls: number;
    };
  }
}

export async function mockYouTubePlayer(page: Page) {
  await page.addInitScript(() => {
    class FixtureYouTubePlayer {
      iframe: HTMLIFrameElement;
      position = 0;
      state = 2;
      playCalls = 0;
      events: {
        onReady?: () => void;
        onStateChange?: (event: {
          data: number;
          target: FixtureYouTubePlayer;
        }) => void;
      };
      constructor(
        elementId: string,
        options: {
          events: {
            onReady?: () => void;
            onStateChange?: (event: {
              data: number;
              target: FixtureYouTubePlayer;
            }) => void;
          };
          playerVars: Record<string, number | string>;
        },
      ) {
        this.events = options.events;
        this.iframe = document.createElement("iframe");
        this.iframe.title = "YouTube lifecycle fixture";
        this.iframe.dataset.controls = String(options.playerVars.controls);
        this.iframe.srcdoc =
          "<body style='background:#171721;color:white'>Provider lifecycle fixture</body>";
        this.iframe.style.cssText = "width:100%;height:100%;border:0";
        document.getElementById(elementId)!.replaceWith(this.iframe);
        window.watchYouTubeFixture = this;
        setTimeout(() => options.events.onReady?.(), 0);
      }
      destroy() {
        this.iframe.remove();
      }
      getCurrentTime() {
        return this.position;
      }
      getDuration() {
        return 60;
      }
      getPlaybackRate() {
        return 1;
      }
      getPlayerState() {
        return this.state;
      }
      getVideoData() {
        return { title: "Provider lifecycle fixture" };
      }
      cueVideoById() {}
      loadVideoById() {}
      mute() {}
      unMute() {}
      pauseVideo() {}
      playVideo() {
        this.playCalls++;
      }
      setVolume() {}
      setPlaybackRate() {}
      seekTo(seconds: number) {
        this.position = seconds;
      }
      triggerState(state: number) {
        this.state = state;
        this.events.onStateChange?.({ data: state, target: this });
      }
    }
    window.YT = {
      Player: FixtureYouTubePlayer,
      PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
    };
  });
}
