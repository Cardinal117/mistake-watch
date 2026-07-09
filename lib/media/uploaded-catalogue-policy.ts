export type UploadedCatalogueAccount =
  | { status: "guest" }
  | {
      accountStatus: string;
      id: string;
      role: string;
      status: "signed-in";
    };

export type UploadedCatalogueAuthorization = {
  status: string;
  user_id: string;
};

export type UploadedCatalogueAccessReason =
  | "active_allowlist"
  | "active_owner"
  | "disabled_account"
  | "guest"
  | "not_allowlisted"
  | "revoked_allowlist";

export type UploadedCatalogueAccessDecision =
  | {
      allowed: true;
      reason: "active_allowlist" | "active_owner";
      scope: "allowlisted" | "owner";
    }
  | {
      allowed: false;
      reason:
        | "disabled_account"
        | "guest"
        | "not_allowlisted"
        | "revoked_allowlist";
      scope: "none";
    };

export type UploadedMediaRoomAuthority = "allowed" | "denied";

type ActiveOwnerAccount = Extract<
  UploadedCatalogueAccount,
  { status: "signed-in" }
> & {
  accountStatus: "active";
  role: "owner";
};

function isActiveOwner(
  account: UploadedCatalogueAccount,
): account is ActiveOwnerAccount {
  return (
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active"
  );
}

export function canAccessUploadedCatalogue(
  account: UploadedCatalogueAccount,
  authorization: UploadedCatalogueAuthorization | null,
): UploadedCatalogueAccessDecision {
  if (account.status === "guest") {
    return {
      allowed: false,
      reason: "guest",
      scope: "none",
    };
  }

  if (account.accountStatus !== "active") {
    return {
      allowed: false,
      reason: "disabled_account",
      scope: "none",
    };
  }

  if (isActiveOwner(account)) {
    return {
      allowed: true,
      reason: "active_owner",
      scope: "owner",
    };
  }

  if (!authorization) {
    return {
      allowed: false,
      reason: "not_allowlisted",
      scope: "none",
    };
  }

  if (authorization.user_id !== account.id) {
    return {
      allowed: false,
      reason: "not_allowlisted",
      scope: "none",
    };
  }

  if (authorization.status !== "active") {
    return {
      allowed: false,
      reason: "revoked_allowlist",
      scope: "none",
    };
  }

  return {
    allowed: true,
    reason: "active_allowlist",
    scope: "allowlisted",
  };
}
