"use client";
import { RoomHomeToolbar } from "../../shared/room-home-toolbar";
export function ListenHomeToolbar({
  canSwitch,
  onSwitchMode,
  view,
  onSelect,
}: {
  canSwitch: boolean;
  onSwitchMode(mode: "watch" | "listen"): Promise<void>;
  view: "discover" | "visualizer" | null;
  onSelect(view: "discover" | "visualizer"): void;
}) {
  return (
    <RoomHomeToolbar
      mode="listen"
      canSwitch={canSwitch}
      onSwitchMode={onSwitchMode}
      selected={view}
      onSelect={(id) =>
        onSelect(id === "visualizer" ? "visualizer" : "discover")
      }
      options={[
        {
          id: "discover",
          label: "Discover",
          controls: "listen-discover-panel",
          tabId: "listen-stage-tab-discover",
        },
        {
          id: "visualizer",
          label: "Visualizer",
          controls: "listen-visualizer-panel",
          tabId: "listen-stage-tab-visualizer",
        },
      ]}
    />
  );
}
