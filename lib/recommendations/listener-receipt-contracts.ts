import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";

export type ListenerReceipt = {
  receiptId: string;
  roomId: string;
  memberId: string;
  accountId: string;
  occurrenceId: string;
  consentEpoch: string;
  historyGeneration: bigint;
  sourceType: string;
  sourceReference: string;
  durationSeconds: number;
  coverageJson: string;
  firstObservedMs: bigint;
  lastObservedMs: bigint;
  createdMs: bigint;
  methodologyVersion: number;
};
export type ListenerLearningGrant = {
  roomId: string;
  memberId: string;
  admissionId: string;
  identityHex: string;
  accountId: string;
  consentEpoch: string;
  historyGeneration: bigint;
  validFromMs: bigint;
  expiresMs: bigint;
};
export type AccountListeningCounts = {
  methodologyVersion: 1;
  scope: "account_listener";
  windowDays: 180;
  coverageStartedAt: string | null;
  items: Array<{
    sourceType: "direct" | "hls" | "uploaded";
    sourceId: string;
    completedPlayCount: number;
    lastCompletedAt: string;
    roomCounts: { personal: number; themed: number; shared: number };
  }>;
};
export function listenerSourceIdentity(input: {
  sourceType: string;
  sourceUrl: string;
}) {
  const ref = input.sourceUrl.trim();
  if (
    !["direct", "hls"].includes(input.sourceType) ||
    !ref ||
    ref.length > 2048
  )
    return null;
  if (ref.startsWith("mw-uploaded-asset:")) {
    const id = ref.slice("mw-uploaded-asset:".length);
    return /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)
      ? { sourceType: "uploaded" as const, sourceId: id.toLowerCase() }
      : null;
  }
  return {
    sourceType: input.sourceType as "direct" | "hls",
    sourceId: createHash("sha256").update(ref).digest("hex"),
  };
}
export function durableListenerReceipt(receipt: ListenerReceipt) {
  const identity = listenerSourceIdentity({
    sourceType: receipt.sourceType,
    sourceUrl: receipt.sourceReference,
  });
  if (!identity)
    throw new Error("Listener receipt has unsupported measurement origin");
  return {
    ...identity,
    accountId: receipt.accountId,
    roomId: receipt.roomId,
    memberId: receipt.memberId,
    occurrenceId: receipt.occurrenceId,
    consentEpoch: receipt.consentEpoch,
    historyGeneration: receipt.historyGeneration.toString(),
    durationSeconds: receipt.durationSeconds,
    coverage: JSON.parse(receipt.coverageJson) as Json,
    firstObservedAt: new Date(Number(receipt.firstObservedMs)).toISOString(),
    lastObservedAt: new Date(Number(receipt.lastObservedMs)).toISOString(),
    methodologyVersion: receipt.methodologyVersion,
  };
}
