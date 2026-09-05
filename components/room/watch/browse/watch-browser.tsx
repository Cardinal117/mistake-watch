"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Film, Folder, Search } from "lucide-react";
import type { LiveRoomState } from "@/lib/spacetime";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { GRID_CATALOGUE_BATCH_SIZE } from "@/lib/media/catalogue-window";
import type { WatchMediaHubItem } from "../contracts";
import type { useMediaLibrary } from "../media-hub/use-media-library";
import { mediaAssetToHubItem } from "../library/media-asset-item";
import { LazyMediaPoster } from "../library/lazy-media-poster";
import { WatchCollectionFilter } from "./watch-collection-filter";
import { WatchMediaDetails } from "./watch-media-details";

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
}: {
  library: Library;
  items: WatchMediaHubItem[];
  liveRoom: LiveRoomState;
  roomId: string;
  preferences: MediaPreferenceController;
  onAdd(): void;
  onManage(): void;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<"discover" | "library" | "history">(
    "discover",
  );
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [limit, setLimit] = useState(GRID_CATALOGUE_BATCH_SIZE);
  const [selected, setSelected] = useState<WatchMediaHubItem | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  function cards(list: WatchMediaHubItem[], eager = false) {
    return (
      <div className="watch-card-grid">
        {list.map((item, index) => (
          <button
            className="watch-media-card"
            key={item.id}
            onClick={() => openDetails(item)}
            aria-label={`Details: ${item.title}`}
          >
            <span className="watch-card-art">
              {item.thumbnailUrl ? (
                <LazyMediaPoster
                  src={item.thumbnailUrl}
                  eager={eager && index < 4}
                  scrollRootRef={scrollRef}
                />
              ) : (
                <Film aria-hidden />
              )}
              {item.isUnavailable && (
                <span className="watch-unavailable">Unavailable</span>
              )}
            </span>
            <span className="watch-card-title">{item.title}</span>
            <span className="watch-card-meta">
              {item.sourceType === "youtube"
                ? "YouTube"
                : item.status === "library"
                  ? "Library"
                  : "Room media"}
              <span>{item.duration}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="watch-browser">
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
      <div
        className="watch-browse-scroll"
        ref={scrollRef}
        hidden={Boolean(selectedVisible)}
      >
        <label className="watch-search">
          <Search aria-hidden />
          <input
            aria-label="Search media"
            placeholder={
              tab === "history" ? "Search room history" : "Search your library"
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(GRID_CATALOGUE_BATCH_SIZE);
            }}
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
                ? "Tonight, together"
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
        {(allowed || tab === "history") && (
          <section className="watch-shelf">
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
              {tab === "discover" && !query && (
                <button onClick={() => changeTab("library")}>
                  View library
                </button>
              )}
            </div>
            {cards(
              filtered.slice(
                0,
                tab === "discover" && !query && !folderId ? 8 : limit,
              ),
              true,
            )}
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
            {(tab !== "discover" || query || folderId) &&
              filtered.length > limit && (
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
              <section className="watch-shelf">
                <div className="watch-shelf-heading">
                  <h3>Your collections</h3>
                </div>
                <div className="watch-collection-grid">
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
            {upcoming.length > 0 && (
              <section className="watch-shelf">
                <div className="watch-shelf-heading">
                  <h3>Coming up in this room</h3>
                </div>
                {cards(upcoming.slice(0, 4))}
              </section>
            )}
            {history.length > 0 && (
              <section className="watch-shelf">
                <div className="watch-shelf-heading">
                  <h3>Recently watched together</h3>
                  <button onClick={() => changeTab("history")}>
                    View history
                  </button>
                </div>
                {cards(history.slice(0, 4))}
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
            roomId={roomId}
            preferences={preferences}
            onClose={closeDetails}
          />
        </div>
      )}
    </div>
  );
}
