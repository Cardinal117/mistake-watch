import type { RefObject } from "react";
import { useCardExpansion } from "./use-card-expansion";

export function useRegularExpansion(
  card: RefObject<HTMLElement | null>,
  menu: RefObject<HTMLDivElement | null>,
  preview: RefObject<HTMLButtonElement | null>,
) {
  return useCardExpansion({
    card,
    menu,
    preview,
    focusSelector: ".personal-regular-details button:not(:disabled)",
  });
}
