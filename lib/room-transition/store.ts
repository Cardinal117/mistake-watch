export type RoomMode = "watch" | "listen";
export type Palette = {
  primary: string;
  secondary: string;
  background: string;
};
export type RoomFacts = {
  roomId: string;
  epoch: number;
  ready: boolean;
  mode: RoomMode;
  error?: string | null;
  retry?: () => void;
};
export type Transition = {
  id: number;
  kind: "mode" | "room" | "navigation" | "action";
  roomId?: string;
  epoch?: number;
  confirmed?: boolean;
  target?: RoomMode;
  fromMode?: RoomMode;
  path?: string;
  label: string;
  detail?: string;
  pending: boolean;
  error?: string;
  startedAt: number;
  palette?: Palette;
  retry?: () => void;
};
export type CompletedTransition = { state: Transition; finishedAt: number };
const modeLabel = (mode: RoomMode) =>
  `Switching to ${mode === "watch" ? "Watch" : "Listen"}`;
/** Local presentation only. Request IDs are not server transaction acknowledgements. */
export function createTransitionStore() {
  let value: Transition | null = null;
  let serial = 0;
  let completed: CompletedTransition | null = null;
  let facts: RoomFacts | null = null;
  let shell: { roomId: string; mode: RoomMode; epoch: number } | null = null;
  let palette: Palette | undefined;
  const writes = new Set<number>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((fn) => fn());
  function finishIfReady() {
    if (
      !value ||
      value.pending ||
      value.error ||
      !["mode", "room"].includes(value.kind)
    )
      return;
    if (
      facts?.ready &&
      (!value.roomId || value.roomId === facts.roomId) &&
      value.epoch === facts.epoch &&
      (!value.target || value.target === facts.mode) &&
      shell?.roomId === facts.roomId &&
      shell.epoch === facts.epoch &&
      shell.mode === facts.mode
    ) {
      completed = { state: value, finishedAt: Date.now() };
      value = null;
      emit();
    }
  }
  function begin(input: Omit<Transition, "id" | "startedAt" | "palette">) {
    const id = ++serial;
    value = { ...input, id, startedAt: Date.now(), palette };
    emit();
    return id;
  }
  return {
    getSnapshot: () => value,
    getCompleted: () => completed,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    begin,
    mode(target: RoomMode) {
      if (writes.size) return null;
      const id = begin({
        kind: "mode",
        roomId: facts?.roomId,
        epoch: facts?.epoch,
        target,
        fromMode: facts?.mode,
        pending: true,
        label: modeLabel(target),
        detail: "Preparing your room.",
      });
      writes.add(id);
      return id;
    },
    settle(id: number) {
      writes.delete(id);
      if (value?.id !== id) return;
      value = { ...value, pending: false };
      emit();
      finishIfReady();
    },
    fail(id: number, error: string) {
      writes.delete(id);
      if (value?.id !== id) return;
      value = { ...value, pending: false, error };
      emit();
    },
    cancel(id?: number) {
      if (!value || (id !== undefined && value.id !== id)) return;
      value = null;
      emit();
    },
    observe(next: RoomFacts) {
      if (facts?.roomId === next.roomId && next.epoch < facts.epoch) return;
      const changed =
        facts && (facts.roomId !== next.roomId || facts.mode !== next.mode);
      const fromMode = facts?.mode;
      const newEpoch =
        facts?.roomId === next.roomId && next.epoch > facts.epoch;
      facts = next;
      if (
        (value?.kind === "navigation" || value?.kind === "action") &&
        (!value.path || value.path === `/rooms/${next.roomId}`)
      ) {
        value = {
          ...value,
          kind: "room",
          roomId: next.roomId,
          epoch: next.epoch,
          target: next.mode,
          pending: false,
        };
        emit();
      }
      // Reconnect invalidates local presentation claims. The unresolved write remains guarded separately.
      if (newEpoch && value?.roomId === next.roomId)
        begin({
          kind: "room",
          roomId: next.roomId,
          epoch: next.epoch,
          target: next.mode,
          pending: false,
          label: "Reconnecting your room",
        });
      if (
        !value &&
        (!next.ready || changed || !shell || shell.epoch !== next.epoch)
      )
        begin({
          kind: "room",
          roomId: next.roomId,
          epoch: next.epoch,
          target: next.mode,
          pending: false,
          label: changed ? modeLabel(next.mode) : "Opening your room",
          fromMode,
          detail: "Connecting your room.",
        });
      if (value?.roomId === next.roomId) {
        if (value.kind === "mode" && value.target === next.mode)
          value = { ...value, confirmed: true };
        if (
          (value.kind === "room" ||
            (value.kind === "mode" && value.confirmed)) &&
          value.target !== next.mode
        ) {
          value = { ...value, target: next.mode, label: modeLabel(next.mode) };
          emit();
        }
        if (next.error) {
          value = { ...value, error: next.error, retry: next.retry };
          emit();
        }
      }
      finishIfReady();
    },
    mounted(roomId: string, mode: RoomMode, epoch: number) {
      shell = { roomId, mode, epoch };
      finishIfReady();
    },
    unmounted(roomId: string, mode: RoomMode, epoch: number) {
      if (
        shell?.roomId === roomId &&
        shell.mode === mode &&
        shell.epoch === epoch
      )
        shell = null;
    },
    releaseAction(id: number) {
      if (value?.id === id && value.kind === "action") {
        value = null;
        emit();
      }
    },
    leave(roomId: string) {
      if (facts?.roomId === roomId) {
        facts = null;
        shell = null;
      }
    },
    route(path: string) {
      if (
        value?.kind === "navigation" &&
        !path.startsWith("/rooms/") &&
        !path.startsWith("/dev/")
      ) {
        value = null;
        emit();
      } else if (
        value?.roomId &&
        path !== `/rooms/${value.roomId}` &&
        !path.startsWith("/dev/")
      ) {
        value = null;
        emit();
      }
      if (!path.startsWith("/rooms/") && !path.startsWith("/dev/"))
        palette = undefined;
    },
    theme(roomId: string, next: Palette) {
      palette = next;
      if (value && (!value.roomId || value.roomId === roomId)) {
        value = { ...value, palette: next };
        emit();
      }
    },
  };
}
export type TransitionStore = ReturnType<typeof createTransitionStore>;
