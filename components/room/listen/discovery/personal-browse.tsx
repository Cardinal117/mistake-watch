"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { PersonalTrack } from "@/lib/recommendations/personal-discovery-model";

export function PersonalBrowse({
  items,
  regulars,
  renderTrack,
}: {
  items: PersonalTrack[];
  regulars: boolean;
  renderTrack(item: PersonalTrack): ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [minimum, setMinimum] = useState("");
  const [likedOnly, setLikedOnly] = useState(false);
  const [sort, setSort] = useState("default");
  const filtered = items.filter(
    (item) =>
      `${item.title} ${item.artist ?? item.channelName ?? ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()) &&
      (!regulars ||
        ((item.completedPlayCount ?? 0) >= Math.max(0, Number(minimum) || 0) &&
          (!likedOnly || item.liked))),
  );
  if (regulars && sort !== "default")
    filtered.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : ((a.completedPlayCount ?? 0) - (b.completedPlayCount ?? 0)) *
            (sort === "plays-asc" ? 1 : -1) || a.title.localeCompare(b.title),
    );
  return (
    <>
      <div className="personal-browse-tools">
        <label>
          Search {regulars ? "regulars" : "tracks"}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Song or artist"
          />
        </label>
        {regulars && (
          <>
            <label className="personal-browse-field">
              Sort regulars
              <span className="personal-browse-select">
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="default">Favourites first</option>
                  <option value="plays-desc">Most played</option>
                  <option value="plays-asc">Least played</option>
                  <option value="title">Title A–Z</option>
                </select>
                <ChevronDown size={16} aria-hidden />
              </span>
            </label>
            <label className="personal-browse-field personal-browse-minimum">
              Minimum recorded plays
              <input
                type="number"
                min="0"
                step="1"
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="personal-browse-check">
              <input
                type="checkbox"
                checked={likedOnly}
                onChange={(e) => setLikedOnly(e.target.checked)}
              />
              <span className="personal-browse-checkmark" aria-hidden>
                <Check size={14} />
              </span>
              Liked only
            </label>
          </>
        )}
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setMinimum("");
            setLikedOnly(false);
            setSort("default");
          }}
        >
          Reset filters
        </button>
      </div>
      <p className="personal-browse-summary" role="status">
        {filtered.length} of {items.length} available tracks
        {regulars ? " · Recorded plays in this room · last 180 days" : ""}
      </p>
      <div className="personal-track-list personal-browse-list">
        {filtered.map(renderTrack)}
      </div>
      {!filtered.length && (
        <p className="personal-empty">No tracks match these filters.</p>
      )}
    </>
  );
}
