"use client";

import { useEffect, useId, useRef } from "react";
import { Check, ChevronDown, Folder } from "lucide-react";

export function WatchCollectionFilter({
  value,
  collections,
  onChange,
}: {
  value: string | null;
  collections: { id: string; name: string; count: number }[];
  onChange(value: string | null): void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const name = useId();
  const selected = collections.find((item) => item.id === value);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  function close() {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }
  }
  const options = [
    { id: "", name: "All collections", count: null },
    ...collections,
  ];
  return (
    <details
      className="watch-collection-filter"
      ref={ref}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <summary
        aria-label={`Collection: ${selected?.name ?? "All collections"}`}
      >
        <Folder aria-hidden />
        <span>{selected?.name ?? "All collections"}</span>
        <ChevronDown aria-hidden />
      </summary>
      <fieldset className="watch-collection-options">
        <legend className="sr-only">Collection</legend>
        {options.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={(value ?? "") === option.id}
              onChange={() => {
                onChange(option.id || null);
                close();
              }}
            />
            <span>{option.name}</span>
            {option.count !== null && <small>{option.count}</small>}
            <Check aria-hidden />
          </label>
        ))}
      </fieldset>
    </details>
  );
}
