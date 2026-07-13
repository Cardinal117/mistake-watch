import { Film, History, Radio, Sparkles, Users } from "lucide-react";

import type { WatchMediaHubItem } from "../contracts";
import { isLiveMediaHubItem } from "../presentation";
import type { WatchMediaHubSectionConfig } from "./watch-media-hub-section";

export function getWatchDiscoverySections({
  historyItems,
  liveItems,
  nonLiveActiveItems,
  queuedItems,
}: {
  historyItems: WatchMediaHubItem[];
  liveItems: WatchMediaHubItem[];
  nonLiveActiveItems: WatchMediaHubItem[];
  queuedItems: WatchMediaHubItem[];
}): WatchMediaHubSectionConfig[] {
  return [
    {
      icon: <Sparkles className="h-4 w-4" aria-hidden />,
      items: nonLiveActiveItems.slice(0, 4),
      label: "For you",
      note: nonLiveActiveItems.length
        ? "Ready from this room's active watch list."
        : "Queue something to seed this row.",
    },
    {
      icon: <Radio className="h-4 w-4" aria-hidden />,
      items: liveItems.slice(0, 4),
      label: "Live",
      note: liveItems.length
        ? "Live streams and HLS links stay easy to find."
        : "HLS and live-looking links will appear here.",
    },
    {
      icon: <Film className="h-4 w-4" aria-hidden />,
      items: queuedItems
        .filter((item) => !isLiveMediaHubItem(item))
        .slice(0, 4),
      label: "Recommended",
      note: queuedItems.length
        ? "Pulled from upcoming room picks for now."
        : "Recommendations need queue or provider data.",
    },
    {
      icon: <History className="h-4 w-4" aria-hidden />,
      items: historyItems.slice(0, 4),
      label: "Room history",
      note: historyItems.length
        ? "Recently watched in this live room."
        : "Played videos will appear here.",
    },
    {
      comingSoon: true,
      icon: <Users className="h-4 w-4" aria-hidden />,
      label: "Shared media",
      note: "Coming soon after account-backed sharing exists.",
    },
  ];
}
