"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const SWITCH_EVENT = "mistake-watch:expand-card";
const PREVIEW_SELECTOR = ".personal-regular-preview, .listen-card-preview";

/** Preserve the pointer target until activation, then close the previous card. */
export function useCardExpansion({
  card,
  preview,
  menu,
  enabled = true,
  focusSelector,
}: {
  card: RefObject<HTMLElement | null>;
  preview: RefObject<HTMLButtonElement | null>;
  menu?: RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  focusSelector?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const pointerPreview = useRef<Element | null>(null);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), 180);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!enabled || !expanded) return;
    if (focusSelector)
      card.current
        ?.querySelector<HTMLButtonElement>(focusSelector)
        ?.focus({ preventScroll: true });
    function collapse() {
      setExpanded(false);
      setClosing(
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    }
    function outside(target: EventTarget | null) {
      return (
        target instanceof Node &&
        !card.current?.contains(target) &&
        !menu?.current?.contains(target)
      );
    }
    function pointerDown(event: PointerEvent) {
      const targetPreview =
        event.target instanceof Element
          ? event.target.closest(PREVIEW_SELECTOR)
          : null;
      pointerPreview.current = targetPreview;
      // Closing now changes layout between pointerdown and click. The other
      // card's activation announces the switch after its click is delivered.
      if (outside(event.target) && !targetPreview) collapse();
    }
    function releasePointer() {
      pointerPreview.current = null;
    }
    function focusOutside(event: FocusEvent) {
      if (event.target === pointerPreview.current) return;
      if (outside(event.target)) collapse();
    }
    function switchCard(event: Event) {
      if ((event as CustomEvent<HTMLElement>).detail !== card.current)
        collapse();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || menu?.current) return;
      event.preventDefault();
      collapse();
      requestAnimationFrame(() =>
        preview.current?.focus({ preventScroll: true }),
      );
    }
    const node = card.current;
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointerup", releasePointer, true);
    document.addEventListener("pointercancel", releasePointer, true);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener(SWITCH_EVENT, switchCard);
    node?.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("pointerup", releasePointer, true);
      document.removeEventListener("pointercancel", releasePointer, true);
      document.removeEventListener("focusin", focusOutside);
      document.removeEventListener(SWITCH_EVENT, switchCard);
      node?.removeEventListener("keydown", escape);
      pointerPreview.current = null;
    };
  }, [expanded, enabled, card, menu, preview, focusSelector]);

  return {
    expanded,
    closing,
    expand() {
      document.dispatchEvent(
        new CustomEvent(SWITCH_EVENT, { detail: card.current }),
      );
      setClosing(false);
      setExpanded(true);
    },
  };
}
