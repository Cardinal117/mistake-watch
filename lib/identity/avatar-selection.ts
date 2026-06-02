"use client";

import { useEffect, useState } from "react";
import {
  getDeterministicAvatarKey,
  isAvatarKey,
  type AvatarKey,
} from "./avatars";

const STORAGE_KEY = "mw_avatar_key";
const AVATAR_CHANGE_EVENT = "mistake-watch:avatar-change";

export function readStoredAvatarKey(seed?: string | null): AvatarKey {
  if (typeof window === "undefined") {
    return getDeterministicAvatarKey(seed);
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  return isAvatarKey(stored) ? stored : getDeterministicAvatarKey(seed);
}

export function writeStoredAvatarKey(key: AvatarKey) {
  window.localStorage.setItem(STORAGE_KEY, key);
  window.dispatchEvent(
    new CustomEvent(AVATAR_CHANGE_EVENT, {
      detail: {
        key,
      },
    }),
  );
}

export function useSelectedAvatarKey(seed?: string | null) {
  const [avatarKey, setAvatarKey] = useState<AvatarKey>(() =>
    readStoredAvatarKey(seed),
  );

  useEffect(() => {
    function handleAvatarChange(event: Event) {
      const nextKey =
        event instanceof StorageEvent
          ? event.key === STORAGE_KEY
            ? event.newValue
            : null
          : (event as CustomEvent<{ key?: string }>).detail?.key;

      if (isAvatarKey(nextKey)) {
        setAvatarKey(nextKey);
      } else if (event instanceof StorageEvent && event.key === STORAGE_KEY) {
        setAvatarKey(readStoredAvatarKey(seed));
      }
    }

    window.addEventListener(AVATAR_CHANGE_EVENT, handleAvatarChange);
    window.addEventListener("storage", handleAvatarChange);

    return () => {
      window.removeEventListener(AVATAR_CHANGE_EVENT, handleAvatarChange);
      window.removeEventListener("storage", handleAvatarChange);
    };
  }, [seed]);

  return {
    avatarKey,
    setAvatarKey: writeStoredAvatarKey,
  };
}
