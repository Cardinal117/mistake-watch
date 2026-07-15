import "server-only";

import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import type { RecommendationEventContract } from "./events";
import type { RecommendationOutboxTransport } from "./outbox-drain";

export { drainRecommendationEventBatch } from "./outbox-drain";

const OUTBOX_TIMEOUT_MS = 5_000;
export async function withTrustedRecommendationOutbox<T>(
  run: (transport: RecommendationOutboxTransport) => Promise<T>,
) {
  const token = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "SPACETIME_SERVER_AUTH_TOKEN is required for outbox access.",
    );
  }

  const transport = await connectTrustedOutbox(token);

  try {
    return await run(transport);
  } finally {
    transport.close();
  }
}

async function connectTrustedOutbox(serverToken: string) {
  const config = getSpacetimeConfig();

  return new Promise<RecommendationOutboxTransport>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(
          new Error("Timed out while connecting to recommendation outbox."),
        );
      }
    }, OUTBOX_TIMEOUT_MS);

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
          readRecommendationEventOutbox(params: {
            limit: number;
          }): Promise<RecommendationEventContract[]>;
        };
        const reducers = connected.reducers as unknown as {
          acknowledgeRecommendationEventOutbox(params: {
            eventIds: string[];
          }): Promise<void> | void;
        };

        resolve({
          acknowledge: (eventIds) =>
            Promise.resolve(
              reducers.acknowledgeRecommendationEventOutbox({ eventIds }),
            ),
          close: () => connected.disconnect(),
          read: (limit) => procedures.readRecommendationEventOutbox({ limit }),
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
            new Error(
              "Disconnected while connecting to recommendation outbox.",
            ),
          );
        }
      })
      .build();

    void connection;
  });
}
