import "server-only";

import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import type { RecommendationRoomAccess } from "./room-authorization";

const PREFERENCE_TIMEOUT_MS = 5_000;

export type RoomMediaPreference = {
  liked: boolean;
  mediaId: string;
  revision: number;
  sourceType: "direct" | "hls" | "uploaded" | "youtube";
};

type PreferenceConnection = {
  close(): void;
  read(): Promise<RoomMediaPreference[]>;
  set(input: {
    actionId: string;
    expectedRevision: number;
    liked: boolean;
    mediaId: string;
    recordNeutralWithoutCurrent: boolean;
    sourceType: RoomMediaPreference["sourceType"];
  }): Promise<void>;
};

export async function readRoomMediaPreferences(
  access: RecommendationRoomAccess,
) {
  return withTrustedPreferenceConnection(access, (connection) =>
    connection.read(),
  );
}

export async function setRoomMediaPreference({
  access,
  actionId,
  expectedRevision,
  liked,
  mediaId,
  recordNeutralWithoutCurrent,
  sourceType,
}: {
  access: RecommendationRoomAccess;
  actionId: string;
  expectedRevision: number;
  liked: boolean;
  mediaId: string;
  recordNeutralWithoutCurrent: boolean;
  sourceType: RoomMediaPreference["sourceType"];
}) {
  return withTrustedPreferenceConnection(access, async (connection) => {
    await connection.set({
      actionId,
      expectedRevision,
      liked,
      mediaId,
      recordNeutralWithoutCurrent,
      sourceType,
    });

    const preferences = await connection.read();
    return (
      preferences.find(
        (preference) =>
          preference.sourceType === sourceType &&
          preference.mediaId === mediaId,
      ) ?? null
    );
  });
}

async function withTrustedPreferenceConnection<T>(
  access: RecommendationRoomAccess,
  run: (connection: PreferenceConnection) => Promise<T>,
) {
  const token = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "SPACETIME_SERVER_AUTH_TOKEN is required for preference access.",
    );
  }

  const connection = await connectTrustedPreference(access, token);

  try {
    return await run(connection);
  } finally {
    connection.close();
  }
}

async function connectTrustedPreference(
  access: RecommendationRoomAccess,
  serverToken: string,
) {
  const config = getSpacetimeConfig();

  return new Promise<PreferenceConnection>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Timed out while connecting to room preferences."));
      }
    }, PREFERENCE_TIMEOUT_MS);

    const connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(serverToken)
      .onConnect((connected) => {
        if (settled) {
          connected.disconnect();
          return;
        }

        settled = true;
        clearTimeout(timeout);
        const procedures = connected.procedures as unknown as {
          readVerifiedRoomMediaPreferences(input: {
            actorMemberId: string;
            roomId: string;
          }): Promise<
            Array<{
              liked: boolean;
              mediaId: string;
              recordNeutralWithoutCurrent: boolean;
              revision: number;
              sourceType: string;
            }>
          >;
        };
        const reducers = connected.reducers as unknown as {
          setVerifiedRoomMediaPreference(input: {
            actorMemberId: string;
            clientActionId: string;
            expectedRevision: number;
            liked: boolean;
            mediaId: string;
            recordNeutralWithoutCurrent: boolean;
            roomId: string;
            sourceType: string;
          }): Promise<void> | void;
        };

        resolve({
          close: () => connected.disconnect(),
          read: async () => {
            const rows = await procedures.readVerifiedRoomMediaPreferences({
              actorMemberId: access.memberId,
              roomId: access.roomId,
            });

            return rows.flatMap((row) => {
              if (!isSourceType(row.sourceType)) {
                return [];
              }

              return [
                {
                  liked: row.liked,
                  mediaId: row.mediaId,
                  revision: row.revision,
                  sourceType: row.sourceType,
                },
              ];
            });
          },
          set: (input) =>
            Promise.resolve(
              reducers.setVerifiedRoomMediaPreference({
                actorMemberId: access.memberId,
                clientActionId: input.actionId,
                expectedRevision: input.expectedRevision,
                liked: input.liked,
                mediaId: input.mediaId,
                recordNeutralWithoutCurrent: input.recordNeutralWithoutCurrent,
                roomId: access.roomId,
                sourceType: input.sourceType,
              }),
            ),
        });
      })
      .onConnectError((error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(error);
        }
      })
      .onDisconnect(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(
            new Error("Disconnected while connecting to room preferences."),
          );
        }
      })
      .build();

    void connection;
  });
}

function isSourceType(
  value: string,
): value is RoomMediaPreference["sourceType"] {
  return ["direct", "hls", "uploaded", "youtube"].includes(value);
}
