"use client";
import { useMemo, useRef, useState, type RefObject } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Film,
  Folder,
  Search,
} from "lucide-react";
import type { LiveRoomState } from "@/lib/spacetime";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { GRID_CATALOGUE_BATCH_SIZE } from "@/lib/media/catalogue-window";
import type { WatchMediaHubItem } from "../contracts";
import type { useMediaLibrary } from "../media-hub/use-media-library";
import { mediaAssetToHubItem } from "../library/media-asset-item";
import { LazyMediaPoster } from "../library/lazy-media-poster";
import { WatchCollectionFilter } from "./watch-collection-filter";
import { WatchCatalogueCard } from "./watch-catalogue-card";
import { WatchMediaDetails } from "./watch-media-details";
import { useWatchPlayCoordinator } from "./use-watch-media-actions";
import "./watch-catalogue-polish.css";

type Library = ReturnType<typeof useMediaLibrary>;

export function WatchBrowser({
  library,
  items,
  liveRoom,
  roomId,
  preferences,
  onAdd,
  onManage,
  isOwner,
  searchQuery,
  onSearchQueryChange,
}: {
  library: Library;
  items: WatchMediaHubItem[];
  liveRoom: LiveRoomState;
  roomId: string;
  preferences: MediaPreferenceController;
  onAdd(): void;
  onManage(): void;
  isOwner: boolean;
  searchQuery?: string;
  onSearchQueryChange?(query: string): void;
}) {
  const [tab, setTab] = useState<"discover" | "library" | "history">(
    "discover",
  );
  const [localQuery, setLocalQuery] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [limit, setLimit] = useState(GRID_CATALOGUE_BATCH_SIZE);
  const [selected, setSelected] = useState<WatchMediaHubItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const collectionRowRef = useRef<HTMLDivElement>(null);
  const readyRowRef = useRef<HTMLDivElement>(null);
  const recentRowRef = useRef<HTMLDivElement>(null);
  const hasExternalSearch =
    searchQuery !== undefined && onSearchQueryChange !== undefined;
  const query = hasExternalSearch ? searchQuery : localQuery;
  const playCoordinator = useWatchPlayCoordinator(liveRoom);
  const allowed = library.libraryAccess?.canAccessUploadedCatalogue === true;
  const assets = useMemo(
    () =>
      allowed
        ? library.assets
            .filter((a) => a.status === "ready")
            .map(mediaAssetToHubItem)
        : [],
    [allowed, library.assets],
  );
  const history = useMemo(
    () =>
      items
        .filter((i) => i.status === "played")
        .slice()
        .reverse(),
    [items],
  );
  const upcoming = useMemo(
    () => items.filter((i) => i.status === "queued"),
    [items],
  );
  const collections = useMemo(
    () =>
      allowed
        ? library.folders
            .map((folder) => ({
              folder,
              items: assets.filter((item) => item.folderId === folder.id),
            }))
            .filter((group) => group.items.length)
        : [],
    [allowed, library.folders, assets],
  );
  const filtered = useMemo(() => {
    const source = tab === "history" ? history : assets;
    const needle = query.trim().toLocaleLowerCase();
    return source.filter(
      (item) =>
        (!folderId || item.folderId === folderId) &&
        (!needle || item.title.toLocaleLowerCase().includes(needle)),
    );
  }, [assets, folderId, history, query, tab]);
  const folderName = library.folders.find((f) => f.id === folderId)?.name;
  function changeTab(next: typeof tab) {
    setTab(next);
    setFolderId(null);
    setLimit(GRID_CATALOGUE_BATCH_SIZE);
  }
  function changeQuery(next: string) {
    if (hasExternalSearch) {
      onSearchQueryChange(next);
    } else {
      setLocalQuery(next);
    }
    setLimit(GRID_CATALOGUE_BATCH_SIZE);
  }
  function scrollRow(row: RefObject<HTMLDivElement | null>, direction: -1 | 1) {
    row.current?.scrollBy({
      left: direction * Math.max(260, row.current.clientWidth * 0.78),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
  function openDetails(item: WatchMediaHubItem) {
    triggerRef.current = document.activeElement as HTMLElement;
    setSelected(item);
  }
  function closeDetails() {
    setSelected(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  const currentSelected = selected
    ? (selected.status === "library" ? assets : items).find(
        (i) => i.id === selected.id,
      )
    : null;
  const selectedVisible = Boolean(
    currentSelected && (currentSelected.status !== "library" || allowed),
  );
  const showGenericShelf = tab !== "discover" || Boolean(query || folderId);
  const canShowResults = tab === "history" || (allowed && !library.assetError);

  function cards(
    list: WatchMediaHubItem[],
    eager = false,
    variant: "grid" | "ready" | "recent" = "grid",
    rowRef?: RefObject<HTMLDivElement | null>,
  ) {
    return (
      <div
        className={`watch-card-grid watch-card-grid--${variant}`}
        ref={rowRef}
      >
        {list.map((item, index) => (
          <WatchCatalogueCard
            eager={eager && index < 4}
            item={item}
            key={item.id}
            liveRoom={liveRoom}
            onDetails={() => openDetails(item)}
            playCoordinator={playCoordinator}
            roomId={roomId}
            scrollRootRef={scrollRef}
            showActions={variant === "ready"}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className="watch-browser"
      data-details={selectedVisible}
      data-external-search={hasExternalSearch}
      data-tab={tab}
    >
      {selectedVisible ? (
        <div className="watch-details-nav">
          <button className="watch-back" onClick={closeDetails}>
            <ArrowLeft aria-hidden /> Back to results
          </button>
        </div>
      ) : (
        <div className="watch-browser-tabs" aria-label="Browse sections">
          {(["discover", "library", "history"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={tab === value}
              onClick={() => changeTab(value)}
            >
              {value === "discover"
                ? "Discover"
                : value === "library"
                  ? "Library"
                  : "History"}
            </button>
          ))}
          {isOwner && (
            <button className="watch-manage-link" onClick={onManage}>
              Manage library
            </button>
          )}
        </div>
      )}
      <div
        className="watch-browse-scroll"
        ref={scrollRef}
        hidden={Boolean(selectedVisible)}
      >
        <label className="watch-search watch-browser-search">
          <Search aria-hidden />
          <input
            aria-label="Search media"
            placeholder={
              tab === "history" ? "Search room history" : "Search your library"
            }
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            type="search"
          />
        </label>
        {tab === "library" && allowed && (
          <WatchCollectionFilter
            value={folderId}
            collections={collections.map(({ folder, items: group }) => ({
              id: folder.id,
              name: folder.name,
              count: group.length,
            }))}
            onChange={(value) => {
              setFolderId(value);
              setLimit(GRID_CATALOGUE_BATCH_SIZE);
            }}
          />
        )}
        {folderId && (
          <button
            className="watch-back"
            onClick={() => {
              setFolderId(null);
              setLimit(GRID_CATALOGUE_BATCH_SIZE);
            }}
          >
            <ArrowLeft />
            All collections
          </button>
        )}
        <div className="watch-browse-heading">
          <h2>
            {folderName ||
              (tab === "discover"
                ? "Discover"
                : tab === "library"
                  ? "Your library"
                  : "Recently watched together")}
          </h2>
          <p>
            {tab === "history"
              ? "Played in this room."
              : "Find your next watch. Keep the room playing."}
          </p>
        </div>
        {library.assetLoading && tab !== "history" && (
          <div
            className="watch-skeletons"
            aria-label="Loading library"
            aria-busy="true"
          >
            {[0, 1, 2, 3].map((i) => (
              <div key={i} />
            ))}
          </div>
        )}
        {library.assetError && tab !== "history" && (
          <div className="watch-empty" role="alert">
            <h3>Library unavailable</h3>
            <p>{library.assetError}</p>
            <button
              onClick={() => {
                void library.refreshMediaLibrary().catch(() => {});
              }}
            >
              Try again
            </button>
          </div>
        )}
        {!library.assetLoading &&
          !library.assetError &&
          !allowed &&
          tab !== "history" && (
            <div className="watch-empty">
              <Folder />
              <h3>Your library is private</h3>
              <p>
                {library.libraryAccess?.message ||
                  "Catalogue access is required. You can still watch the room’s current media."}
              </p>
              <button onClick={onAdd}>Find a video or add a link</button>
            </div>
          )}
        {showGenericShelf && canShowResults && (
          <section className="watch-shelf" data-watch-shelf={tab}>
            <div className="watch-shelf-heading">
              <h3>
                {folderName
                  ? "In this collection"
                  : query.trim()
                    ? "Search results"
                    : tab === "history"
                      ? "Room history"
                      : "Ready to watch"}
              </h3>
            </div>
            {cards(filtered.slice(0, limit), true)}
            {!filtered.length && !library.assetLoading && (
              <div className="watch-empty">
                <Film />
                <h3>
                  {query
                    ? "No matching media"
                    : tab === "history"
                      ? "Your next watch starts the story"
                      : "Nothing ready here yet"}
                </h3>
                <p>
                  {query
                    ? "Try a different title or collection."
                    : "Ready media will appear here as your room and library grow."}
                </p>
                {!query && <button onClick={onAdd}>Add media</button>}
              </div>
            )}
            {filtered.length > limit && (
              <button
                className="watch-show-more"
                onClick={() =>
                  setLimit((count) => count + GRID_CATALOGUE_BATCH_SIZE)
                }
              >
                Show more · {Math.min(limit, filtered.length)} of{" "}
                {filtered.length}
              </button>
            )}
          </section>
        )}
        {tab === "discover" && !query && !folderId && (
          <>
            {collections.length > 0 && (
              <section className="watch-shelf" data-watch-shelf="collections">
                <div className="watch-shelf-heading">
                  <h3>Your collections</h3>
                  <div className="watch-shelf-heading-actions">
                    <button onClick={() => changeTab("library")}>
                      View all
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Previous collections"
                      onClick={() => scrollRow(collectionRowRef, -1)}
                    >
                      <ChevronLeft aria-hidden />
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Next collections"
                      onClick={() => scrollRow(collectionRowRef, 1)}
                    >
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="watch-collection-grid" ref={collectionRowRef}>
                  {collections.slice(0, 12).map(({ folder, items: group }) => (
                    <button
                      key={folder.id}
                      className="watch-collection"
                      onClick={() => {
                        setTab("library");
                        setFolderId(folder.id);
                        setLimit(GRID_CATALOGUE_BATCH_SIZE);
                        scrollRef.current?.scrollTo(0, 0);
                      }}
                    >
                      <span className="watch-collection-art">
                        {group.slice(0, 3).map((i) => (
                          <span key={i.id}>
                            {i.thumbnailUrl ? (
                              <LazyMediaPoster
                                src={i.thumbnailUrl}
                                scrollRootRef={scrollRef}
                              />
                            ) : (
                              <Film />
                            )}
                          </span>
                        ))}
                      </span>
                      <span>
                        <Folder />
                        {folder.name}
                        <small>
                          {group.length}{" "}
                          {group.length === 1 ? "video" : "videos"}
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {allowed && !library.assetError && (
              <section className="watch-shelf" data-watch-shelf="ready">
                <div className="watch-shelf-heading">
                  <h3>Ready to watch</h3>
                  <div className="watch-shelf-heading-actions">
                    <button onClick={() => changeTab("library")}>
                      View library
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Previous ready to watch items"
                      onClick={() => scrollRow(readyRowRef, -1)}
                    >
                      <ChevronLeft aria-hidden />
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Next ready to watch items"
                      onClick={() => scrollRow(readyRowRef, 1)}
                    >
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                </div>
                {cards(assets.slice(0, 8), true, "ready", readyRowRef)}
                {!assets.length && !library.assetLoading && (
                  <div className="watch-empty">
                    <Film aria-hidden />
                    <h3>Nothing ready here yet</h3>
                    <p>Ready media will appear here as your library grows.</p>
                    <button onClick={onAdd}>Add media</button>
                  </div>
                )}
              </section>
            )}
            {history.length > 0 && (
              <section className="watch-shelf" data-watch-shelf="recent">
                <div className="watch-shelf-heading">
                  <h3>Recently watched</h3>
                  <div className="watch-shelf-heading-actions">
                    <button onClick={() => changeTab("history")}>
                      View history
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Previous recently watched items"
                      onClick={() => scrollRow(recentRowRef, -1)}
                    >
                      <ChevronLeft aria-hidden />
                    </button>
                    <button
                      className="watch-shelf-arrow"
                      aria-label="Next recently watched items"
                      onClick={() => scrollRow(recentRowRef, 1)}
                    >
                      <ChevronRight aria-hidden />
                    </button>
                  </div>
                </div>
                {cards(history.slice(0, 4), false, "recent", recentRowRef)}
              </section>
            )}
            {upcoming.length > 0 && (
              <section className="watch-shelf" data-watch-shelf="upcoming">
                <div className="watch-shelf-heading">
                  <h3>Coming up in this room</h3>
                </div>
                {cards(upcoming.slice(0, 4))}
              </section>
            )}
          </>
        )}
      </div>
      {selectedVisible && currentSelected && (
        <div className="watch-browse-scroll">
          <WatchMediaDetails
            key={currentSelected.id}
            item={currentSelected}
            liveRoom={liveRoom}
            playCoordinator={playCoordinator}
            roomId={roomId}
            preferences={preferences}
            onClose={closeDetails}
          />
        </div>
      )}
    </div>
  );
}
