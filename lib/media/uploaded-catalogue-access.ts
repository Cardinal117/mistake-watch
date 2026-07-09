import "server-only";

import { getAccountSummary } from "@/lib/account/server";
import type { AccountSummary } from "@/lib/account/types";
import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";

import {
  canAccessUploadedCatalogue,
  type UploadedCatalogueAccessDecision,
} from "./uploaded-catalogue-policy";

export type UploadedCatalogueAccess = UploadedCatalogueAccessDecision & {
  message: string;
};

export async function getUploadedCatalogueAccess(
  account?: AccountSummary,
): Promise<UploadedCatalogueAccess> {
  const currentAccount = account ?? (await getAccountSummary());

  if (currentAccount.status === "guest") {
    return toAccessResponse(canAccessUploadedCatalogue(currentAccount, null));
  }

  if (
    currentAccount.accountStatus !== "active" ||
    currentAccount.role === "owner"
  ) {
    return toAccessResponse(canAccessUploadedCatalogue(currentAccount, null));
  }

  const admin = createSupabaseAdminClient();
  const { data: authorization, error } = await admin
    .from("uploaded_catalogue_authorizations")
    .select("status,user_id")
    .eq("user_id", currentAccount.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toAccessResponse(
    canAccessUploadedCatalogue(
      currentAccount,
      authorization as Pick<
        Tables<"uploaded_catalogue_authorizations">,
        "status" | "user_id"
      > | null,
    ),
  );
}

function toAccessResponse(
  decision: UploadedCatalogueAccessDecision,
): UploadedCatalogueAccess {
  if (decision.allowed) {
    return {
      ...decision,
      message:
        decision.scope === "owner"
          ? "Owner catalogue access granted."
          : "Uploaded catalogue access granted.",
    };
  }

  return {
    ...decision,
    message:
      decision.reason === "guest"
        ? "No permission to access uploaded content. Sign in with an authorized Google account to browse the uploaded catalogue."
        : decision.reason === "disabled_account"
          ? "No permission to access uploaded content. This account is not active."
          : "No permission to access uploaded content. This Google account is not on the uploaded catalogue allowlist.",
  };
}
