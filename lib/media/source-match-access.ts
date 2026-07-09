export type SourceMatchAccessAccount =
  | { status: "guest" }
  | {
      accountStatus: string;
      id: string;
      role: string;
      status: "signed-in";
    };

export type SourceMatchAssetAccess = {
  owner_user_id: string;
  status: string;
  visibility: string;
};

export type SourceMatchVisibilityFilter =
  | { kind: "owner"; ownerUserId: string }
  | { kind: "public" };

type ActiveOwnerAccount = Extract<
  SourceMatchAccessAccount,
  { status: "signed-in" }
> & {
  accountStatus: "active";
  role: "owner";
};

function isActiveOwner(
  account: SourceMatchAccessAccount,
): account is ActiveOwnerAccount {
  return (
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active"
  );
}

export function getSourceMatchVisibilityFilter(
  account: SourceMatchAccessAccount,
): SourceMatchVisibilityFilter {
  if (isActiveOwner(account)) {
    return {
      kind: "owner",
      ownerUserId: account.id,
    };
  }

  return { kind: "public" };
}

export function canExposeSourceMatchedAsset(
  asset: SourceMatchAssetAccess,
  account: SourceMatchAccessAccount,
) {
  if (asset.status !== "ready") {
    return false;
  }

  if (asset.visibility === "public") {
    return true;
  }

  return isActiveOwner(account) && asset.owner_user_id === account.id;
}

export function redactSourceMatchedAssetForResponse<
  TAsset extends { thumbnailObjectKey?: string | null },
>(asset: TAsset): TAsset {
  return {
    ...asset,
    thumbnailObjectKey: null,
  };
}
