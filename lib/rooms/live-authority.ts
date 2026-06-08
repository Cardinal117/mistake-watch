import "server-only";

import { randomBytes } from "node:crypto";

import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";

export type LiveRoomSeedInput = {
  hostMemberId: string;
  roomId: string;
};

const SEED_GRANT_TTL_MS = 60_000;
const SEED_GRANT_TIMEOUT_MS = 5_000;
const SEED_TOKEN_BYTES = 32;

type SeedGrantReducers = {
  issueRoomSeedGrant(params: {
    expiresMs: bigint;
    hostMemberId: string;
    roomId: string;
    seedToken: string;
  }): Promise<void> | void;
};

export async function createLiveRoomSeedToken({
  hostMemberId,
  roomId,
}: LiveRoomSeedInput) {
  const serverToken = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();

  if (!serverToken) {
    return null;
  }

  const seedToken = randomBytes(SEED_TOKEN_BYTES).toString("base64url");
  const expiresMs = BigInt(Date.now() + SEED_GRANT_TTL_MS);

  await issueSeedGrant({
    expiresMs,
    hostMemberId,
    roomId,
    seedToken,
    serverToken,
  });

  return seedToken;
}

async function issueSeedGrant({
  expiresMs,
  hostMemberId,
  roomId,
  seedToken,
  serverToken,
}: LiveRoomSeedInput & {
  expiresMs: bigint;
  seedToken: string;
  serverToken: string;
}) {
  const config = getSpacetimeConfig();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let connection: { disconnect(): void } | undefined;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      connection?.disconnect();
      reject(new Error("Timed out while issuing live room seed grant."));
    }, SEED_GRANT_TIMEOUT_MS);

    connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(serverToken)
      .onConnect((connected) => {
        void Promise.resolve(
          (connected.reducers as unknown as SeedGrantReducers).issueRoomSeedGrant(
            {
              expiresMs,
              hostMemberId,
              roomId,
              seedToken,
            },
          ),
        )
          .then(() => {
            if (settled) {
              return;
            }

            settled = true;
            clearTimeout(timeout);
            connected.disconnect();
            resolve();
          })
          .catch((error: unknown) => {
            if (settled) {
              return;
            }

            settled = true;
            clearTimeout(timeout);
            connected.disconnect();
            reject(error);
          });
      })
      .onConnectError((error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        reject(error);
      })
      .onDisconnect(() => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeout);
        reject(new Error("Disconnected while issuing live room seed grant."));
      })
      .build();
  });
}
