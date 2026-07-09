import type {
  UploadedCatalogueAccount,
  UploadedCatalogueAuthorization,
  UploadedMediaRoomAuthority,
} from "./uploaded-catalogue-policy";
import { canAccessUploadedCatalogue } from "./uploaded-catalogue-policy";

export type UploadedRoomMediaSessionStatus =
  | "active"
  | "ended"
  | "expired"
  | "revoked";

export type UploadedRoomParticipant = {
  roomId: string;
  status: "active" | "inactive";
};

export type UploadedRoomMediaSessionAccess = {
  endedAt?: string | null;
  expiresAt: string;
  roomId: string;
  status: string;
};

export type UploadedRoomPlaybackDecision =
  | {
      allowed: true;
      reason: "active_room_session";
    }
  | {
      allowed: false;
      reason:
        | "asset_not_ready"
        | "expired_session"
        | "inactive_participant"
        | "inactive_session"
        | "missing_participant"
        | "unrelated_room";
    };

export function canStartUploadedMedia(input: {
  account: UploadedCatalogueAccount;
  assetStatus: string;
  authorization: UploadedCatalogueAuthorization | null;
  roomAuthority: UploadedMediaRoomAuthority;
}) {
  const catalogueAccess = canAccessUploadedCatalogue(
    input.account,
    input.authorization,
  );

  return (
    catalogueAccess.allowed &&
    input.roomAuthority === "allowed" &&
    input.assetStatus === "ready"
  );
}

export function canWatchRoomMedia(input: {
  assetStatus: string;
  now?: Date;
  participant: UploadedRoomParticipant | null;
  roomId: string;
  session: UploadedRoomMediaSessionAccess | null;
}): UploadedRoomPlaybackDecision {
  if (!input.participant) {
    return {
      allowed: false,
      reason: "missing_participant",
    };
  }

  if (input.participant.status !== "active") {
    return {
      allowed: false,
      reason: "inactive_participant",
    };
  }

  if (!input.session || input.session.roomId !== input.roomId) {
    return {
      allowed: false,
      reason: "unrelated_room",
    };
  }

  if (input.participant.roomId !== input.roomId) {
    return {
      allowed: false,
      reason: "unrelated_room",
    };
  }

  if (input.session.status !== "active" || input.session.endedAt) {
    return {
      allowed: false,
      reason: "inactive_session",
    };
  }

  const now = input.now ?? new Date();

  if (new Date(input.session.expiresAt).getTime() <= now.getTime()) {
    return {
      allowed: false,
      reason: "expired_session",
    };
  }

  if (input.assetStatus !== "ready") {
    return {
      allowed: false,
      reason: "asset_not_ready",
    };
  }

  return {
    allowed: true,
    reason: "active_room_session",
  };
}
