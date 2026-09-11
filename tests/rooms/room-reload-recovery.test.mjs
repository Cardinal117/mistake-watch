import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function render(reason) {
  const exports = {},
    timers = [],
    redirects = [];
  let retries = 0;
  const jsx = (type, props) => ({ type, props });
  const stubs = {
    react: {
      useEffect: (fn) => fn(),
      useMemo: (fn) => fn(),
      useRef: () => ({ current: null }),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/dynamic": () => () => null,
    "next/navigation": {
      useRouter: () => ({ replace: (url) => redirects.push(url) }),
    },
    "@/lib/spacetime": {
      useLiveRoom: () => ({
        snapshot: { session: { mode: "watch" } },
        removalNotice: "Connection waiting",
        removalReason: reason,
        connectionReadiness: { status: "ready" },
        retryConnection: () => retries++,
      }),
    },
    "@/lib/performance/room-transition": { completeRoomTransition() {} },
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("components/room/room-experience.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    {
      exports,
      require: (name) => stubs[name] ?? {},
      window: {
        setTimeout: (fn) => timers.push(fn),
        clearTimeout() {},
      },
    },
  );
  const result = exports.RoomExperience({
    account: { status: "guest" },
    room: { id: "room" },
  });
  timers.forEach((fn) => fn());
  return {
    result,
    redirects,
    retry: () => {
      result.props.retry();
      return retries;
    },
  };
}

test("admission timeout stays on the room and offers explicit retry", () => {
  const f = render("admission-failed");
  assert.deepEqual(f.redirects, []);
  assert.equal(f.result.props.readiness.status, "error");
  assert.equal(f.retry(), 1);
});

test("actual host removal still redirects away and offers no retry bypass", () => {
  const f = render("removed");
  assert.deepEqual(f.redirects, ["/?notice=removed-from-room"]);
  assert.equal(f.result.props.retry, undefined);
});

test("retry clears a previous missing-member notice before reconnecting", () => {
  const values = [],
    setters = [];
  const exports = {};
  const stubs = {
    react: {
      useEffect() {},
      useRef: (value) => ({ current: value }),
      useState: (initial) => {
        const index = values.length;
        values.push(typeof initial === "function" ? initial() : initial);
        const set = (value) => {
          values[index] =
            typeof value === "function" ? value(values[index]) : value;
        };
        setters.push(set);
        return [values[index], set];
      },
    },
    "./snapshot": { buildFallbackSnapshot: () => ({ participants: [] }) },
  };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync("lib/spacetime/live-room/use-room-connection.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText,
    { exports, require: (name) => stubs[name] ?? {} },
  );
  const live = exports.useRoomConnection({ id: "room" });
  live.setMemberMissingNotice("Stale admission timeout");
  live.retryConnection();
  assert.equal(values.includes("Stale admission timeout"), false);
  assert.equal(values[0], "connecting");
});

test("server load boundary shows generic text and invokes same-route recovery", () => {
  let retries = 0;
  const exports = {};
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(
    ts.transpileModule(readFileSync("app/rooms/[roomId]/error.tsx", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    {
      exports,
      require: (name) =>
        name === "react/jsx-runtime"
          ? { jsx, jsxs: jsx }
          : { AppShell: "shell", Panel: "panel", Button: "button" },
    },
  );
  const tree = exports.default({
    retry: () => retries++,
    error: new Error("private database details"),
  });
  function walk(node) {
    if (!node || typeof node !== "object") return [];
    return [node, ...[node.props?.children].flat().flatMap(walk)];
  }
  const nodes = walk(tree);
  assert.equal(
    JSON.stringify(tree).includes("private database details"),
    false,
  );
  const button = nodes.find((node) => node.type === "button");
  assert.equal(button.props.children, "Try again");
  button.props.onClick();
  assert.equal(retries, 1);
});
