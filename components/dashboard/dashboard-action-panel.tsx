import { Link2, Plus } from "lucide-react";

import { Badge } from "@/components/ui";
import { CreateRoomForm } from "./create-room-form";
import { JoinRoomForm } from "./join-room-form";

export function DashboardActionPanel() {
  return (
    <div className="overflow-hidden border border-white/10 bg-transparent lg:border-0">
      <div className="flex justify-end border-b border-white/10 bg-surface/0 p-4 pl-16">
        <Badge>Room Controls</Badge>
      </div>

      <div className="grid gap-3 p-3">
        <section aria-labelledby="create-room-panel-heading">
          <div className="mb-3 flex items-center gap-2 text-label-sm font-semibold text-primary-fixed-dim">
            <Plus className="h-4 w-4" aria-hidden />
            <h3 id="create-room-panel-heading">Create</h3>
          </div>
          <CreateRoomForm attached />
        </section>

        <section aria-labelledby="join-room-panel-heading">
          <div className="mb-3 flex items-center gap-2 text-label-sm font-semibold text-primary-fixed-dim">
            <Link2 className="h-4 w-4" aria-hidden />
            <h3 id="join-room-panel-heading">Join</h3>
          </div>
          <JoinRoomForm attached />
        </section>
      </div>
    </div>
  );
}
