import { useEffect, useState, type RefObject } from "react";

// Same in-flow reveal and 180ms reverse dismissal as mobile RecommendationCard.
export function useRegularExpansion(
  card: RefObject<HTMLElement | null>,
  menu: RefObject<HTMLDivElement | null>,
  preview: RefObject<HTMLButtonElement | null>,
) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  function collapse() {
    setExpanded(false);
    setClosing(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), 180);
    return () => clearTimeout(timer);
  }, [closing]);
  useEffect(() => {
    if (!expanded) return;
    card.current
      ?.querySelector<HTMLButtonElement>(
        ".personal-regular-details button:not(:disabled)",
      )
      ?.focus({ preventScroll: true });
    function dismiss(event: Event) {
      if (
        event.target instanceof Node &&
        !card.current?.contains(event.target) &&
        !menu.current?.contains(event.target)
      )
        collapse();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || menu.current) return;
      event.preventDefault();
      collapse();
      requestAnimationFrame(() =>
        preview.current?.focus({ preventScroll: true }),
      );
    }
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss);
    const node = card.current;
    node?.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("focusin", dismiss);
      node?.removeEventListener("keydown", escape);
    };
  }, [expanded, card, menu, preview]);
  return {
    expanded,
    closing,
    expand() {
      setClosing(false);
      setExpanded(true);
    },
  };
}
