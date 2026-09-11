import "server-only";
import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import type {
  ListenerLearningGrant,
  ListenerReceipt,
} from "./listener-receipt-contracts";

type ListenerAuthority = {
  grant(input: ListenerLearningGrant): Promise<void>;
  read(limit: number): Promise<ListenerReceipt[]>;
  acknowledge(receiptIds: string[]): Promise<void>;
  close(): void;
};
async function bounded<T>(run: Promise<T>, milliseconds = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Listener authority operation timed out")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function connect(): Promise<ListenerAuthority> {
  const token = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();
  if (!token) throw new Error("Trusted listener authority is not configured");
  const config = getSpacetimeConfig();
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Listener authority connection timed out"));
      }
    }, 5000);
    DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(token)
      .onConnect((connection) => {
        if (settled) {
          connection.disconnect();
          return;
        }
        settled = true;
        clearTimeout(timer);
        const reducers = connection.reducers as unknown as {
          grantListenerLearning(input: ListenerLearningGrant): Promise<void>;
          acknowledgeListenerReceipts(input: {
            receiptIds: string[];
          }): Promise<void>;
        };
        const procedures = connection.procedures as unknown as {
          readListenerReceipts(input: {
            limit: number;
          }): Promise<ListenerReceipt[]>;
        };
        resolve({
          grant: (input) =>
            bounded(Promise.resolve(reducers.grantListenerLearning(input))),
          read: (limit) => bounded(procedures.readListenerReceipts({ limit })),
          acknowledge: (receiptIds) =>
            bounded(
              Promise.resolve(
                reducers.acknowledgeListenerReceipts({ receiptIds }),
              ),
            ),
          close: () => connection.disconnect(),
        });
      })
      .onConnectError(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("Listener authority connection failed"));
        }
      })
      .onDisconnect(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(new Error("Listener authority disconnected"));
        }
      })
      .build();
  });
}
export async function withListenerAuthority<T>(
  run: (authority: ListenerAuthority) => Promise<T>,
) {
  const authority = await connect();
  try {
    return await run(authority);
  } finally {
    authority.close();
  }
}
export async function grantListenerLearning(input: ListenerLearningGrant) {
  await withListenerAuthority((authority) => authority.grant(input));
}
