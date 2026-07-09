const uploadedAssetReferencePrefix = "mw-uploaded-asset:";
const uploadedSessionReferencePrefix = "mw-uploaded-session:";

export function createUploadedAssetReference(assetId: string) {
  return `${uploadedAssetReferencePrefix}${assetId}`;
}

export function createUploadedSessionReference(sessionId: string) {
  return `${uploadedSessionReferencePrefix}${sessionId}`;
}

export function parseUploadedAssetReference(sourceUrl: string | null | undefined) {
  return parseUploadedReference(sourceUrl, uploadedAssetReferencePrefix);
}

export function parseUploadedSessionReference(
  sourceUrl: string | null | undefined,
) {
  return parseUploadedReference(sourceUrl, uploadedSessionReferencePrefix);
}

export function isUploadedPlaybackReference(
  sourceUrl: string | null | undefined,
) {
  return (
    Boolean(parseUploadedAssetReference(sourceUrl)) ||
    Boolean(parseUploadedSessionReference(sourceUrl))
  );
}

function parseUploadedReference(
  sourceUrl: string | null | undefined,
  prefix: string,
) {
  const value = sourceUrl?.trim();

  if (!value?.startsWith(prefix)) {
    return null;
  }

  const id = value.slice(prefix.length).trim();

  return id || null;
}
