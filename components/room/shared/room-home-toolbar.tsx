"use client";
import { ModeSwitcher } from "../mode-switcher";
import "../listen/mobile/listen-home-toolbar.css";
export function RoomHomeToolbar({
  mode,
  canSwitch,
  onSwitchMode,
  selected,
  options,
  onSelect,
}: {
  mode: "watch" | "listen";
  canSwitch: boolean;
  onSwitchMode(mode: "watch" | "listen"): Promise<void>;
  selected: string | null;
  options: readonly {
    id: string;
    label: string;
    controls?: string;
    tabId?: string;
  }[];
  onSelect(id: string): void;
}) {
  return (
    <div className="listen-home-toolbar" aria-label="Home controls">
      <div className="listen-home-modes">
        <ModeSwitcher
          mode={mode}
          compact
          iconsOnly
          canSwitch={canSwitch}
          onSwitchMode={onSwitchMode}
        />
      </div>
      <span className="listen-home-divider" aria-hidden />
      <div
        role="tablist"
        aria-label={mode === "listen" ? "Listen workspace" : "Media source"}
        className="listen-home-views"
      >
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={item.tabId}
            aria-controls={item.controls}
            aria-selected={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
