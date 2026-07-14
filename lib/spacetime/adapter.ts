import { getSpacetimeConfig } from "./config";
import type {
  GrantRoomControlPayload,
  JoinRoomReducerPayload,
  LiveRoomSnapshot,
  LoadMediaSourcePayload,
  AddQueueItemPayload,
  AdvanceQueueItemPayload,
  AdvanceUploadedQueueItemPayload,
  IssueRoomSeedGrantPayload,
  MoveQueueItemPayload,
  QueueItemReducerPayload,
  ReportMediaFailurePayload,
  RevokeRoomControlPayload,
  SeedRoomSessionPayload,
  SetMemberPermissionsPayload,
  SetPlaybackStatePayload,
  UpdateMediaTitlePayload,
} from "./types";

export type SpacetimeConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export type GeneratedConnection = {
  disconnect(): void;
  reducers: {
    addQueueItem(payload: AddQueueItemPayload): void;
    advanceQueueItem(payload: AdvanceQueueItemPayload): void;
    advanceUploadedQueueItem(payload: AdvanceUploadedQueueItemPayload): void;
    clearQueue(payload: { actorMemberId: string; roomId: string }): void;
    grantRoomControl(payload: GrantRoomControlPayload): void;
    heartbeat(payload: { memberId: string; roomId: string }): void;
    issueRoomSeedGrant(payload: IssueRoomSeedGrantPayload): void;
    joinRoom(payload: JoinRoomReducerPayload): void;
    kickMember(payload: {
      actorMemberId: string;
      roomId: string;
      targetMemberId: string;
    }): void;
    leaveRoom(payload: { memberId: string; roomId: string }): void;
    loadMediaSource(payload: LoadMediaSourcePayload): void;
    moveQueueItem(payload: MoveQueueItemPayload): void;
    playQueueItem(payload: QueueItemReducerPayload): void;
    removeQueueItem(payload: QueueItemReducerPayload): void;
    reportMediaFailure(payload: ReportMediaFailurePayload): void;
    removeIdleMember(payload: {
      actorMemberId: string;
      roomId: string;
      targetMemberId: string;
    }): void;
    revokeRoomControl(payload: RevokeRoomControlPayload): void;
    seedRoomSession(payload: SeedRoomSessionPayload): void;
    setMemberPermissions(payload: SetMemberPermissionsPayload): void;
    setPlaybackState(payload: SetPlaybackStatePayload): void;
    updateMediaTitle(payload: UpdateMediaTitlePayload): void;
  };
  subscriptionBuilder(): {
    subscribe(queries: string[]): void;
  };
};

type GeneratedConnectionBuilder = {
  build(): GeneratedConnection;
  onConnect(
    callback: (
      connection: GeneratedConnection,
      identity: unknown,
      token: string,
    ) => void,
  ): GeneratedConnectionBuilder;
  onConnectError(
    callback: (error: unknown) => void,
  ): GeneratedConnectionBuilder;
  onDisconnect(callback: () => void): GeneratedConnectionBuilder;
  withDatabaseName(databaseName: string): GeneratedConnectionBuilder;
  withToken(token: string): GeneratedConnectionBuilder;
  withUri(uri: string): GeneratedConnectionBuilder;
};

export type GeneratedDbConnection = {
  builder(): GeneratedConnectionBuilder;
};

export type SpacetimeGeneratedBindings = {
  DbConnection: GeneratedDbConnection;
};

export type CreateRoomConnectionInput = {
  bindings: SpacetimeGeneratedBindings;
  member: JoinRoomReducerPayload;
  onSnapshot?: (snapshot: LiveRoomSnapshot) => void;
  onStatus?: (status: SpacetimeConnectionStatus) => void;
  token?: string;
};

export function createRoomConnection({
  bindings,
  member,
  onStatus,
  token,
}: CreateRoomConnectionInput) {
  const config = getSpacetimeConfig();

  onStatus?.("connecting");

  return bindings.DbConnection.builder()
    .withUri(config.uri)
    .withDatabaseName(config.databaseName)
    .withToken(token ?? "")
    .onConnect((connected) => {
      onStatus?.("connected");
      connected
        .subscriptionBuilder()
        .subscribe(getRoomSubscriptions(member.roomId));
      connected.reducers.joinRoom(member);
    })
    .onDisconnect(() => {
      onStatus?.("disconnected");
    })
    .onConnectError(() => {
      onStatus?.("error");
    })
    .build();
}

export function getRoomSubscriptions(roomId: string) {
  const safeRoomId = roomId.replace(/'/g, "''");

  return [
    `SELECT * FROM room_session WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM room_participant WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM room_permission WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM room_kick WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM live_queue_item WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM room_chat_message WHERE room_id = '${safeRoomId}'`,
    `SELECT * FROM room_error WHERE room_id = '${safeRoomId}'`,
  ];
}
