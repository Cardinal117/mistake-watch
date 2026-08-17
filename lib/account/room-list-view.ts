import type { AccountRoomSummary } from "./room-projection";

export type AccountRoomRelationshipFilter =
  | "all"
  | "joined"
  | "owned"
  | "saved";

export type AccountRoomSort = "name" | "oldest" | "recent";

export type AccountRoomListView = {
  closedRooms: AccountRoomSummary[];
  filteredCount: number;
  openRooms: AccountRoomSummary[];
};

export function projectAccountRoomListView({
  query,
  relationship,
  rooms,
  sort,
}: {
  query: string;
  relationship: AccountRoomRelationshipFilter;
  rooms: AccountRoomSummary[];
  sort: AccountRoomSort;
}): AccountRoomListView {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRooms = rooms.filter(
    (room) =>
      matchesQuery(room, normalizedQuery) &&
      matchesRelationship(room, relationship),
  );
  const sortedRooms = [...filteredRooms].sort((left, right) =>
    compareRooms(left, right, sort),
  );

  return {
    closedRooms: sortedRooms.filter((room) => room.status === "closed"),
    filteredCount: sortedRooms.length,
    openRooms: sortedRooms.filter((room) => room.status === "open"),
  };
}

function matchesQuery(room: AccountRoomSummary, normalizedQuery: string) {
  return (
    normalizedQuery.length === 0 ||
    room.name.toLowerCase().includes(normalizedQuery)
  );
}

function matchesRelationship(
  room: AccountRoomSummary,
  relationship: AccountRoomRelationshipFilter,
) {
  if (relationship === "all") return true;
  if (relationship === "saved") return room.isSaved;
  return room.relationship === relationship;
}

function compareRooms(
  left: AccountRoomSummary,
  right: AccountRoomSummary,
  sort: AccountRoomSort,
) {
  if (sort === "name") {
    return compareText(left.name, right.name) || compareText(left.id, right.id);
  }

  const leftActivity = parseActivity(left.lastActiveAt);
  const rightActivity = parseActivity(right.lastActiveAt);

  if (leftActivity === null && rightActivity !== null) return 1;
  if (leftActivity !== null && rightActivity === null) return -1;
  if (leftActivity !== null && rightActivity !== null) {
    const activityOrder =
      sort === "oldest"
        ? leftActivity - rightActivity
        : rightActivity - leftActivity;

    if (activityOrder !== 0) return activityOrder;
  }

  return compareText(left.name, right.name) || compareText(left.id, right.id);
}

function compareText(left: string, right: string) {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();

  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
}

function parseActivity(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}
