import type { Page } from "@playwright/test";
export async function mockYouTubePlayer(page: Page) {
  await page.addInitScript(() => {
    class FixtureYouTubePlayer {
      iframe: HTMLIFrameElement;
      position = 0;
      constructor(
        elementId: string,
        options: {
          events: { onReady?: () => void };
          playerVars: Record<string, number | string>;
        },
      ) {
        this.iframe = document.createElement("iframe");
        this.iframe.title = "YouTube lifecycle fixture";
        this.iframe.dataset.controls = String(options.playerVars.controls);
        this.iframe.srcdoc =
          "<body style='background:#171721;color:white'>Provider lifecycle fixture</body>";
        this.iframe.style.cssText = "width:100%;height:100%;border:0";
        document.getElementById(elementId)!.replaceWith(this.iframe);
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
        return 2;
      }
      getVideoData() {
        return { title: "Provider lifecycle fixture" };
      }
      cueVideoById() {}
      loadVideoById() {}
      mute() {}
      unMute() {}
      pauseVideo() {}
      playVideo() {}
      setVolume() {}
      setPlaybackRate() {}
      seekTo(seconds: number) {
        this.position = seconds;
      }
    }
    window.YT = {
      Player: FixtureYouTubePlayer,
      PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
    };
  });
}
