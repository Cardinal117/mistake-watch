import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { getAccountSummary } from "@/lib/account/server";
import {
  getGuestIdentityCookieName,
  reclaimGuestMembership,
} from "@/lib/identity";
import { DbConnection } from "@/lib/spacetime/generated";
import { getSpacetimeConfig } from "@/lib/spacetime/config";
import { createSupabaseAdminClient } from "@/lib/supabase";

const ADMISSION_TTL_MS = 60_000;
const ADMISSION_TIMEOUT_MS = 5_000;
const TOKEN_BYTES = 32;

type AdmissionMember = {
  authorizationKind: "account" | "guest";
  memberId: string;
  role: "host" | "guest";
};

type AdmissionGrantReducers = {
  issueRoomAdmissionGrant(params: {
    admissionId: string;
    admissionToken: string;
    authorizationKind: AdmissionMember["authorizationKind"];
    expiresMs: bigint;
    identityHex: string;
    memberId: string;
    role: AdmissionMember["role"];
    roomId: string;
  }): Promise<void> | void;
};

export class LiveAdmissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LiveAdmissionError";
  }
}

export async function createLiveRoomAdmission(input: {
  identityHex: string;
  roomId: string;
}) {
  const identityHex = input.identityHex.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(identityHex)) {
    throw new LiveAdmissionError("Invalid live connection identity.", 400);
  }

  const member = await resolveAdmissionMember(input.roomId);

  if (!member) {
    throw new LiveAdmissionError("Active room membership is required.", 403);
  }

  const serverToken = process.env.SPACETIME_SERVER_AUTH_TOKEN?.trim();

  if (!serverToken) {
    throw new LiveAdmissionError(
      "Live room admission is not configured.",
      503,
    );
  }

  const admissionId = randomBytes(18).toString("base64url");
  const admissionToken = randomBytes(TOKEN_BYTES).toString("base64url");
  const expiresAt = Date.now() + ADMISSION_TTL_MS;

  await issueAdmissionGrant({
    admissionId,
    admissionToken,
    expiresMs: BigInt(expiresAt),
    identityHex,
    member,
    roomId: input.roomId,
    serverToken,
  });

  return { admissionId, admissionToken, expiresAt };
}

async function resolveAdmissionMember(
  roomId: string,
): Promise<AdmissionMember | null> {
  const account = await getAccountSummary();

  if (account.status === "signed-in") {
    if (account.accountStatus !== "active") {
      return null;
    }

    const admin = createSupabaseAdminClient();
    const [{ data: room, error: roomError }, { data: member, error: memberError }] =
      await Promise.all([
        admin
          .from("rooms")
          .select("id")
          .eq("id", roomId)
          .eq("status", "open")
          .maybeSingle(),
        admin
          .from("room_members")
          .select("id, role")
          .eq("room_id", roomId)
          .eq("user_id", account.id)
          .maybeSingle(),
      ]);

    if (roomError || memberError) {
      throw roomError ?? memberError;
    }

    if (room && member) {
      return {
        authorizationKind: "account",
        memberId: member.id,
        role: member.role === "host" ? "host" : "guest",
      };
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(getGuestIdentityCookieName(roomId))?.value;
  const session = token
    ? await reclaimGuestMembership({ roomId, token })
    : null;

  if (!session || session.room.status !== "open") {
    return null;
  }

  return {
    authorizationKind: "guest",
    memberId: session.member.id,
    role: session.member.role === "host" ? "host" : "guest",
  };
}

async function issueAdmissionGrant(input: {
  admissionId: string;
  admissionToken: string;
  expiresMs: bigint;
  identityHex: string;
  member: AdmissionMember;
  roomId: string;
  serverToken: string;
}) {
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
      () => finish(new Error("Timed out while issuing live admission.")),
      ADMISSION_TIMEOUT_MS,
    );

    connection = DbConnection.builder()
      .withUri(config.uri)
      .withDatabaseName(config.databaseName)
      .withToken(input.serverToken)
      .onConnect((connected) => {
        void Promise.resolve(
          (
            connected.reducers as unknown as AdmissionGrantReducers
          ).issueRoomAdmissionGrant({
            admissionId: input.admissionId,
            admissionToken: input.admissionToken,
            authorizationKind: input.member.authorizationKind,
            expiresMs: input.expiresMs,
            identityHex: input.identityHex,
            memberId: input.member.memberId,
            role: input.member.role,
            roomId: input.roomId,
          }),
        ).then(() => finish(), finish);
      })
      .onConnectError(finish)
      .onDisconnect(() =>
        finish(new Error("Disconnected while issuing live admission.")),
      )
      .build();
  });
}
