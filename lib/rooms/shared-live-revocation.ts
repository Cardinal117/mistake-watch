import "server-only";
import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
const REVOCATION_TIMEOUT_MS = 5000;
export async function revokeLiveMembership(roomId: string, memberId: string) {
  return runLiveCommand((c) =>
    c.reducers.revokeRoomMembership({ roomId, memberId }),
  );
}
export async function retireLiveRoom(roomId: string, purge: boolean) {
  return runLiveCommand((c) => c.reducers.retireRoom({ roomId, purge }));
}
async function runLiveCommand(
  command: (connection: DbConnection) => Promise<void>,
) {
  const serverToken = process.env.SPACETIME_SERVER_AUTH_TOKEN;
  if (!serverToken) throw new Error("Live authority unavailable");
  const config = getSpacetimeConfig();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let connection: { disconnect(): void } | undefined;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      connection?.disconnect();
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(
      () => finish(new Error("Timed out while revoking live membership.")),
      REVOCATION_TIMEOUT_MS,
    );

    connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(serverToken)
      .onConnect((connected) => {
        void Promise.resolve(command(connected)).then(() => finish(), finish);
      })
      .onConnectError(finish)
      .onDisconnect(() =>
        finish(new Error("Disconnected while revoking live membership.")),
      )
      .build();
  });
}
