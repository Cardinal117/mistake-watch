import { table, t } from "spacetimedb/server";

const roomIndex = {
  accessor: "by_room_id",
  algorithm: "btree",
  columns: ["room_id"],
} as const;
// All listener state is private: account identity/permission never enters room subscriptions.
export const listenerGrant = table(
  {
    name: "listener_grant",
    indexes: [
      roomIndex,
      { accessor: "by_expiry", algorithm: "btree", columns: ["expires_ms"] },
    ],
  },
  {
    session_key: t.string().primaryKey(),
    room_id: t.string(),
    member_id: t.string(),
    admission_id: t.string(),
    connection_id: t.connectionId(),
    account_id: t.string(),
    consent_epoch: t.string(),
    history_generation: t.u64(),
    valid_from_ms: t.i64(),
    expires_ms: t.i64(),
  },
);
export const listenerCursor = table(
  { name: "listener_cursor", indexes: [roomIndex] },
  {
    session_key: t.string().primaryKey(),
    room_id: t.string(),
    partition_key: t.string(),
    at_ms: t.i64(),
    anchor_ms: t.i64(),
    position: t.f64(),
    sequence: t.u64(),
    audible: t.bool(),
  },
);
export const listenerCoverage = table(
  {
    name: "listener_coverage",
    indexes: [
      roomIndex,
      { accessor: "by_updated", algorithm: "btree", columns: ["updated_ms"] },
    ],
  },
  {
    partition_key: t.string().primaryKey(),
    room_id: t.string(),
    account_id: t.string(),
    occurrence_id: t.string(),
    consent_epoch: t.string(),
    history_generation: t.u64(),
    intervals_json: t.string(),
    first_observed_ms: t.i64(),
    updated_ms: t.i64(),
    emitted: t.bool(),
  },
);
export const listenerReceiptOutbox = table(
  {
    name: "listener_receipt_outbox",
    indexes: [
      roomIndex,
      { accessor: "by_created", algorithm: "btree", columns: ["created_ms"] },
    ],
  },
  {
    receipt_id: t.string().primaryKey(),
    room_id: t.string(),
    member_id: t.string(),
    account_id: t.string(),
    occurrence_id: t.string(),
    consent_epoch: t.string(),
    history_generation: t.u64(),
    source_type: t.string(),
    source_reference: t.string(),
    duration_seconds: t.u32(),
    coverage_json: t.string(),
    first_observed_ms: t.i64(),
    last_observed_ms: t.i64(),
    created_ms: t.i64(),
    methodology_version: t.u32(),
  },
);
