export const ACCOUNT_ROOMS_REFRESH_INTERVAL_MS = 4_000;

export function shouldRefreshAccountRooms({
  documentHidden,
  online,
  requestPending,
}: {
  documentHidden: boolean;
  online: boolean;
  requestPending: boolean;
}) {
  return !documentHidden && online && !requestPending;
}

export function shouldApplyAccountRoomSnapshot({
  disposed,
  latestRequestSequence,
  requestSequence,
}: {
  disposed: boolean;
  latestRequestSequence: number;
  requestSequence: number;
}) {
  return !disposed && latestRequestSequence === requestSequence;
}
