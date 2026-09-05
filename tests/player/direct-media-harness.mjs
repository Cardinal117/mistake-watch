import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { setImmediate } from "node:timers/promises";

// Execute the actual component and sync module. Only React scheduling, browser
// media operations and room transport are deterministic substitutes.
export function player({ canControl = true, queue = [], mode = "watch" } = {}) {
  let now = 100_000;
  let index = 0;
  const slots = [];
  let effects = [];
  const intervals = new Map();
  const timeouts = new Map();
  let timerId = 0;
  let tree;
  const publications = [];
  const advances = [];
  const session = {
    roomId: "fixture-room",
    hostMemberId: "host",
    sourceType: "direct",
    sourceUrl: "https://example.invalid/fixture.mp4",
    sourceDurationSeconds: 120,
    positionSeconds: 20,
    serverUpdatedMs: now,
    status: "playing",
    queueAutoplayEnabled: true,
  };
  const media = {
    src: "",
    currentTime: 20,
    duration: 120,
    paused: true,
    ended: false,
    playbackRate: 1,
    playCalls: 0,
    loadCalls: 0,
    playResult: () => Promise.resolve(),
    play() {
      this.playCalls++;
      this.paused = false;
      return this.playResult();
    },
    pause() {
      this.paused = true;
    },
    load() {
      this.loadCalls++;
    },
    removeAttribute() {},
    canPlayType() {
      return "probably";
    },
  };
  const react = {
    useRef(initial) {
      const i = index++;
      return (slots[i] ??= { current: initial });
    },
    useState(initial) {
      const i = index++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value) => {
          slots[i] = typeof value === "function" ? value(slots[i]) : value;
        },
      ];
    },
    useMemo(fn) {
      return fn();
    },
    useEffect(effect, deps) {
      const i = index++;
      const prior = slots[i];
      if (
        !prior ||
        !deps ||
        deps.some((d, j) => !Object.is(d, prior.deps[j]))
      ) {
        effects.push(() => {
          prior?.cleanup?.();
          slots[i] = { deps, cleanup: effect() };
        });
      }
    },
  };
  react.useLayoutEffect = react.useEffect;
  const jsx = (type, props) => ({ type, props });
  const cache = new Map();
  const root = process.cwd();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const require = (spec) => {
      if (spec === "react") return react;
      if (spec === "react/jsx-runtime")
        return { jsx, jsxs: jsx, Fragment: "fragment" };
      if (spec === "@/lib/player")
        return load(path.join(root, "lib/player/sync.ts"));
      if (spec === "@/lib/player/local-controls")
        return {
          readStoredPlayerVolume: () => 0.2,
          PLAYER_VOLUME_EVENT: "volume",
        };
      let resolved = spec.startsWith("@/")
        ? path.join(root, spec.slice(2))
        : path.resolve(path.dirname(file), spec);
      assert.ok(
        spec.startsWith("@/") || spec.startsWith("."),
        `unexpected dependency ${spec}`,
      );
      resolved += existsSync(resolved + ".ts") ? ".ts" : ".tsx";
      return load(resolved);
    };
    vm.runInNewContext(
      ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: file,
      }).outputText,
      {
        module: mod,
        exports: mod.exports,
        require,
        Date: class extends Date {
          static now() {
            return now;
          }
        },
        window: {
          setTimeout(fn) {
            const id = ++timerId;
            timeouts.set(id, fn);
            return id;
          },
          clearTimeout(id) {
            timeouts.delete(id);
          },
          setInterval(fn) {
            const id = ++timerId;
            intervals.set(id, fn);
            return id;
          },
          clearInterval(id) {
            intervals.delete(id);
          },
          addEventListener() {},
          removeEventListener() {},
        },
        document: {
          fullscreenElement: null,
          addEventListener() {},
          removeEventListener() {},
        },
      },
      { filename: file },
    );
    return mod.exports;
  }
  const Component = load(
    path.join(root, "components/room/direct-media-player.tsx"),
  ).DirectMediaPlayer;
  const liveRoom = {
    canControlPlayback: canControl,
    snapshot: { session, queue },
    setPlaybackState(value) {
      publications.push({ ...value });
    },
    advanceToNextQueueItem(value) {
      advances.push(value);
    },
    updateMediaTitle() {},
  };
  function render() {
    index = 0;
    effects = [];
    const core = Component({ liveRoom, mode });
    tree = core.type(core.props);
    tree.props.children[0].props.ref(media);
    for (const effect of effects) effect();
  }
  function flushTimeouts() {
    const pending = [...timeouts.values()];
    timeouts.clear();
    for (const fn of pending) fn();
  }
  render();
  flushTimeouts();
  render();
  return {
    media,
    publications,
    advances,
    session,
    async tick({ settle = true } = {}) {
      for (const callback of [...intervals.values()]) callback();
      await setImmediate();
      if (settle) flushTimeouts();
      render();
    },
    async settle() {
      await setImmediate();
      render();
    },
    update(values) {
      Object.assign(session, values, { serverUpdatedMs: now });
      render();
    },
    elapse(ms) {
      now += ms;
    },
    ended() {
      tree.props.children[0].props.onEnded();
      render();
    },
    get blocked() {
      return Boolean(tree.props.children[1]);
    },
  };
}
