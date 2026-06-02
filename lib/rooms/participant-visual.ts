const PARTICIPANT_VISUALS = [
  {
    accentClassName:
      "border-primary-fixed-dim/45 bg-primary-fixed-dim/10 text-primary-fixed-dim",
    dotClassName: "bg-primary-fixed-dim",
  },
  {
    accentClassName:
      "border-secondary-fixed-dim/45 bg-secondary-fixed-dim/10 text-secondary-fixed-dim",
    dotClassName: "bg-secondary-fixed-dim",
  },
  {
    accentClassName:
      "border-tertiary-fixed-dim/45 bg-tertiary-fixed-dim/10 text-tertiary-fixed-dim",
    dotClassName: "bg-tertiary-fixed-dim",
  },
  {
    accentClassName: "border-error/45 bg-error/10 text-error",
    dotClassName: "bg-error",
  },
  {
    accentClassName: "border-outline/55 bg-outline/10 text-on-surface-variant",
    dotClassName: "bg-outline",
  },
] as const;

export function getParticipantVisual(seed: string) {
  return PARTICIPANT_VISUALS[hashString(seed) % PARTICIPANT_VISUALS.length];
}

export function getParticipantIconIndex(seed: string, iconCount: number) {
  return hashString(`${seed}:icon`) % Math.max(iconCount, 1);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
