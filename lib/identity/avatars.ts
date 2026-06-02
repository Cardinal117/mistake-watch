export type AvatarKey =
  | "audio"
  | "controller"
  | "cooling"
  | "memory"
  | "network"
  | "power"
  | "processor"
  | "storage";

export type AvatarCatalogItem = {
  description: string;
  key: AvatarKey;
  label: string;
  src: string;
};

export const avatarCatalog = [
  {
    description: "Signal and sound hardware.",
    key: "audio",
    label: "Audio Card",
    src: "/avatars/audio-card-avatar.png",
  },
  {
    description: "Control board and input systems.",
    key: "controller",
    label: "Controller",
    src: "/avatars/controller-board-avatar.png",
  },
  {
    description: "Cooling and airflow module.",
    key: "cooling",
    label: "Cooling Fan",
    src: "/avatars/cooling-fan-avatar.png",
  },
  {
    description: "Memory and cache module.",
    key: "memory",
    label: "Memory",
    src: "/avatars/memory-module-avatar.png",
  },
  {
    description: "Room network interface.",
    key: "network",
    label: "Network",
    src: "/avatars/network-module-avatar.png",
  },
  {
    description: "Power and energy module.",
    key: "power",
    label: "Power",
    src: "/avatars/power-module-avatar.png",
  },
  {
    description: "Main processor module.",
    key: "processor",
    label: "Processor",
    src: "/avatars/processor-avatar-no-crown.png",
  },
  {
    description: "Storage drive module.",
    key: "storage",
    label: "Storage",
    src: "/avatars/storage-drive-avatar.png",
  },
] satisfies AvatarCatalogItem[];

export const hostCrownSrc = "/avatars/host-crown-overlay.png";

const avatarKeySet = new Set<string>(avatarCatalog.map((avatar) => avatar.key));

export function isAvatarKey(
  value: string | null | undefined,
): value is AvatarKey {
  return Boolean(value && avatarKeySet.has(value));
}

export function getAvatarByKey(key: string | null | undefined) {
  return avatarCatalog.find((avatar) => avatar.key === key) ?? null;
}

export function getDeterministicAvatarKey(seed: string | null | undefined) {
  const safeSeed = seed || "mistake-watch";
  let hash = 0;

  for (let index = 0; index < safeSeed.length; index += 1) {
    hash = (hash * 31 + safeSeed.charCodeAt(index)) >>> 0;
  }

  return avatarCatalog[hash % avatarCatalog.length].key;
}
