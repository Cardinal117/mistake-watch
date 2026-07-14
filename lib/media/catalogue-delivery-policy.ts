export type CatalogueDeliveryAccount =
  | { status: "guest" }
  | {
      accountStatus: string;
      id: string;
      role: string;
      status: "signed-in";
    };

export type CatalogueDeliveryAsset = {
  ownerUserId: string;
  posterReady: boolean;
  status: string;
  visibility: string;
};

export function canDeliverCatalogueAsset(input: {
  account: CatalogueDeliveryAccount;
  asset: CatalogueDeliveryAsset;
  catalogueAllowed: boolean;
  kind: "content" | "poster";
}) {
  if (
    !input.catalogueAllowed ||
    input.account.status !== "signed-in" ||
    input.account.accountStatus !== "active"
  ) {
    return false;
  }

  const isOwner =
    input.account.role === "owner" &&
    input.account.id === input.asset.ownerUserId;

  if (!isOwner && input.asset.visibility !== "public") {
    return false;
  }

  return input.kind === "poster"
    ? input.asset.posterReady
    : input.asset.status === "ready";
}
