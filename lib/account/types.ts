export type AccountRole = "owner" | "member";
export type AccountStatus = "active" | "disabled";
export type AvatarSource = "guest_avatar" | "google_avatar" | "custom";

export type AccountSummary =
  | {
      status: "guest";
    }
  | {
      status: "signed-in";
      avatarKey: string | null;
      avatarSource: AvatarSource;
      avatarUrl: string | null;
      displayName: string;
      email: string | null;
      googleAvatarUrl: string | null;
      handle: string | null;
      id: string;
      role: AccountRole;
      accountStatus: AccountStatus;
    };
