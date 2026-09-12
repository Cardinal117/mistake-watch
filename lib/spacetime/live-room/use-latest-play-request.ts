"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createLatestPlayRequestCoordinator } from "./latest-play-request";

type PlayCommandState<Reducers> = {
  actorMemberId?: string;
  authorized: boolean;
  reducers?: Reducers;
  roomId: string;
};

export function useLatestPlayRequest<Reducers>(
  nextState: PlayCommandState<Reducers>,
) {
  const coordinator = useRef(createLatestPlayRequestCoordinator());
  const state = useRef(nextState);

  useLayoutEffect(() => {
    const previous = state.current;
    if (
      previous.actorMemberId !== nextState.actorMemberId ||
      previous.authorized !== nextState.authorized ||
      previous.roomId !== nextState.roomId
    )
      coordinator.current.invalidate();
    state.current = nextState;
  }, [nextState]);

  useEffect(() => {
    const current = coordinator.current;
    current.activate();
    return () => current.dispose();
  }, []);

  return {
    begin(externalIsCurrent?: () => boolean) {
      return coordinator.current.begin(
        () =>
          state.current.authorized &&
          Boolean(state.current.actorMemberId && state.current.reducers) &&
          externalIsCurrent?.() !== false,
      );
    },
    getCurrent: () => state.current,
    invalidate: () => coordinator.current.invalidate(),
  };
}
