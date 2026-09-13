"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  createTransitionStore,
  type TransitionStore,
} from "@/lib/room-transition/store";
import { RoomLoadingScreen } from "./screen";
import { RoomLoadingReveal } from "./reveal";
import "./room-loading.css";
const Context = createContext<TransitionStore | null>(null);
export function useRoomTransitions() {
  return useContext(Context);
}
export function RoomTransitionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createTransitionStore);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    () => null,
  );
  const pathname = usePathname();
  useEffect(() => {
    store.route(pathname);
  }, [pathname, store]);
  useEffect(() => {
    const cancel = () => store.cancel();
    window.addEventListener("popstate", cancel);
    return () => window.removeEventListener("popstate", cancel);
  }, [store]);
  return (
    <Context.Provider value={store}>
      <div
        data-room-app-content
        inert={!!state}
        aria-busy={!!state}
        style={{ display: "contents" }}
      >
        {children}
      </div>
      <RoomLoadingReveal active={!!state} completed={store.getCompleted()} />
      {state &&
        createPortal(
          <div data-room-loading-host>
            <RoomLoadingScreen
              key={state.id}
              state={state}
              onBack={() => {
                store.cancel(state.id);
                // End this document's pending action/navigation callbacks as well.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Terminal recovery must discard in-flight action redirects in this document.
                window.location.assign("/");
              }}
              onDismiss={() => store.cancel(state.id)}
            />
          </div>,
          document.body,
        )}
    </Context.Provider>
  );
}
