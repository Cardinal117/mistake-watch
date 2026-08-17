"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SearchX, X } from "lucide-react";

import { Button } from "@/components/ui";
import {
  projectAccountRoomListView,
  type AccountRoomRelationshipFilter,
  type AccountRoomSort,
} from "@/lib/account/room-list-view";
import type { AccountRoomSummary } from "@/lib/account/room-projection";
import { cx } from "@/lib/ui";

import { AccountRoomRow } from "./account-room-row";

export function AccountRoomListView({
  currentRoomId,
  onChanged,
  rooms,
}: {
  currentRoomId?: string;
  onChanged(): void;
  rooms: AccountRoomSummary[];
}) {
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] =
    useState<AccountRoomRelationshipFilter>("all");
  const [sort, setSort] = useState<AccountRoomSort>("recent");
  const view = useMemo(
    () => projectAccountRoomListView({ query, relationship, rooms, sort }),
    [query, relationship, rooms, sort],
  );
  const controlsChanged =
    query.trim().length > 0 || relationship !== "all" || sort !== "recent";
  const revealKey =
    query.trim().length > 0 || relationship !== "all"
      ? `${query.trim().toLowerCase()}:${relationship}`
      : null;

  function resetControls() {
    setQuery("");
    setRelationship("all");
    setSort("recent");
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-md border border-white/10 bg-surface-container-lowest/35 p-3 lg:grid-cols-[minmax(12rem,1fr)_10rem_10rem_auto] lg:items-end">
        <label className="grid gap-1.5" htmlFor="account-room-search">
          <span className="technical-label text-on-surface-variant">
            Search rooms
          </span>
          <span className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              className="h-10 w-full rounded-sm border border-white/10 bg-surface-container-low pl-9 pr-3 text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim/60 focus:ring-2 focus:ring-primary-fixed-dim/15"
              id="account-room-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Room name"
              type="search"
              value={query}
            />
          </span>
        </label>

        <label className="grid gap-1.5" htmlFor="account-room-relationship">
          <span className="technical-label text-on-surface-variant">
            Relationship
          </span>
          <select
            className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-label-sm text-on-surface outline-none focus:border-primary-fixed-dim/60 focus:ring-2 focus:ring-primary-fixed-dim/15"
            id="account-room-relationship"
            onChange={(event) =>
              setRelationship(
                event.target.value as AccountRoomRelationshipFilter,
              )
            }
            value={relationship}
          >
            <option value="all">All rooms</option>
            <option value="owned">Owned</option>
            <option value="joined">Joined</option>
            <option value="saved">Saved</option>
          </select>
        </label>

        <label className="grid gap-1.5" htmlFor="account-room-sort">
          <span className="technical-label text-on-surface-variant">Sort</span>
          <select
            className="h-10 rounded-sm border border-white/10 bg-surface-container-low px-3 text-label-sm text-on-surface outline-none focus:border-primary-fixed-dim/60 focus:ring-2 focus:ring-primary-fixed-dim/15"
            id="account-room-sort"
            onChange={(event) => setSort(event.target.value as AccountRoomSort)}
            value={sort}
          >
            <option value="recent">Recent activity</option>
            <option value="name">Name</option>
            <option value="oldest">Oldest activity</option>
          </select>
        </label>

        <Button
          disabled={!controlsChanged}
          onClick={resetControls}
          size="sm"
          type="button"
          variant="ghost"
        >
          <X className="h-4 w-4" aria-hidden />
          Reset
        </Button>
      </div>

      <p aria-live="polite" className="technical-label text-on-surface-variant">
        {view.filteredCount} of {rooms.length} shown
      </p>

      {view.filteredCount === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-container-lowest/42 p-5">
          <SearchX className="h-5 w-5 text-primary-fixed-dim" aria-hidden />
          <p className="mt-3 text-body-md font-semibold text-on-surface">
            No matching rooms
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Adjust the room name or relationship filter to see more spaces.
          </p>
          <Button
            className="mt-4"
            onClick={resetControls}
            size="sm"
            type="button"
            variant="secondary"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          <AccountRoomGroup
            currentRoomId={currentRoomId}
            defaultExpanded
            emptyCopy="No open rooms match this view."
            key={`open:${revealKey ?? "default"}`}
            label="Open rooms"
            onChanged={onChanged}
            rooms={view.openRooms}
          />
          <AccountRoomGroup
            currentRoomId={currentRoomId}
            defaultExpanded={Boolean(revealKey && view.closedRooms.length > 0)}
            emptyCopy="No closed rooms match this view."
            key={`closed:${revealKey ?? "default"}`}
            label="Closed history"
            onChanged={onChanged}
            rooms={view.closedRooms}
          />
        </div>
      )}
    </div>
  );
}

function AccountRoomGroup({
  currentRoomId,
  defaultExpanded = false,
  emptyCopy,
  label,
  onChanged,
  rooms,
}: {
  currentRoomId?: string;
  defaultExpanded?: boolean;
  emptyCopy: string;
  label: string;
  onChanged(): void;
  rooms: AccountRoomSummary[];
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <details
      className="overflow-hidden rounded-md border border-white/10 bg-surface-container-lowest/42"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
      open={expanded}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-label-sm font-semibold text-on-surface outline-none transition hover:bg-white/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-fixed-dim/45 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <span className="flex items-center gap-3">
          <span className="technical-label text-on-surface-variant">
            {rooms.length}
          </span>
          <ChevronDown
            aria-hidden
            className={cx(
              "h-4 w-4 text-on-surface-variant transition-transform",
              expanded && "rotate-180",
            )}
          />
        </span>
      </summary>

      <div className="divide-y divide-white/10 border-t border-white/10">
        {rooms.length > 0 ? (
          rooms.map((room) => (
            <AccountRoomRow
              currentRoomId={currentRoomId}
              key={room.id}
              onChanged={onChanged}
              room={room}
            />
          ))
        ) : (
          <p className="px-4 py-5 text-label-sm text-on-surface-variant">
            {emptyCopy}
          </p>
        )}
      </div>
    </details>
  );
}
