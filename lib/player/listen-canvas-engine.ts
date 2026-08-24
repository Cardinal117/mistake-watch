type FrameRequest = (callback: (timestamp: number) => void) => number;

type ListenCanvasEngineOptions<Input> = {
  cancelFrame?(id: number): void;
  fps?: 24 | 30;
  getInput(timestamp: number): Input;
  onDispose?(): void;
  render(input: Input, timestamp: number, deltaMs: number): void;
  requestFrame?: FrameRequest;
};

export class ListenCanvasEngine<Input> {
  private readonly cancelFrame: (id: number) => void;
  private readonly fps: 24 | 30;
  private readonly getInput: (timestamp: number) => Input;
  private readonly onDispose?: () => void;
  private readonly renderFrame: (
    input: Input,
    timestamp: number,
    deltaMs: number,
  ) => void;
  private readonly requestFrame: FrameRequest;
  private disposed = false;
  private frameId: number | null = null;
  private lastRenderedAt: number | null = null;
  private running = false;
  private stoppedReason: string | null = "initial";

  constructor(options: ListenCanvasEngineOptions<Input>) {
    this.cancelFrame =
      options.cancelFrame ?? ((id) => globalThis.cancelAnimationFrame(id));
    this.fps = options.fps ?? 24;
    this.getInput = options.getInput;
    this.onDispose = options.onDispose;
    this.renderFrame = options.render;
    this.requestFrame =
      options.requestFrame ??
      ((callback) => globalThis.requestAnimationFrame(callback));
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.stoppedReason = null;
    this.lastRenderedAt = null;
    this.schedule();
  }

  stop(reason: string) {
    this.running = false;
    this.stoppedReason = reason;
    this.lastRenderedAt = null;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
  }

  dispose() {
    if (this.disposed) return;
    this.stop("unmounted");
    this.disposed = true;
    this.onDispose?.();
  }

  snapshot() {
    return {
      disposed: this.disposed,
      running: this.running,
      stoppedReason: this.stoppedReason,
    };
  }

  private schedule() {
    if (!this.running || this.disposed || this.frameId !== null) return;
    this.frameId = this.requestFrame((timestamp) => this.onFrame(timestamp));
  }

  private onFrame(timestamp: number) {
    this.frameId = null;
    if (!this.running || this.disposed) return;
    const interval = 1_000 / this.fps;
    const elapsed =
      this.lastRenderedAt === null ? interval : timestamp - this.lastRenderedAt;
    if (this.lastRenderedAt === null || elapsed >= interval - 0.5) {
      this.renderFrame(this.getInput(timestamp), timestamp, elapsed);
      this.lastRenderedAt = timestamp;
    }
    this.schedule();
  }
}
