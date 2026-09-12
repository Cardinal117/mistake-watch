import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";

export const defaultPersonalFeedbackCopy = {
  snooze: "Not now · 7 days",
  exclude: "Don't suggest this track",
};

export function personalFeedbackCopy(
  account: AccountSummary,
  room: Pick<RoomSnapshot, "kind" | "currentMember">,
) {
  const enabled =
    account.status === "signed-in" &&
    account.accountStatus === "active" &&
    account.personalFeedbackStyle === "af-casual" &&
    room.kind === "personal" &&
    room.currentMember?.role === "host" &&
    room.currentMember.userId === account.id;
  return enabled
    ? { snooze: "Fokof vir 7 dae", exclude: "Fok nee, vat die kak weg" }
    : defaultPersonalFeedbackCopy;
}
