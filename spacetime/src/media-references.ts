import { normalizeSourceUrl } from "./normalization";

const uploadedAssetReferencePrefix = "mw-uploaded-asset:";
const uploadedSessionReferencePrefix = "mw-uploaded-session:";

export function isUploadedAssetReference(sourceUrl: string) {
  return hasUploadedReference(sourceUrl, uploadedAssetReferencePrefix);
}

export function isUploadedSessionReference(sourceUrl: string) {
  return hasUploadedReference(sourceUrl, uploadedSessionReferencePrefix);
}

function hasUploadedReference(sourceUrl: string, prefix: string) {
  const normalized = normalizeSourceUrl(sourceUrl);
  return (
    normalized.length <= 512 &&
    normalized.startsWith(prefix) &&
    Boolean(normalized.slice(prefix.length).trim())
  );
}

export function resolveQueuePlaybackSource(
  queueSourceUrl: string,
  resolvedSourceUrl: string | undefined,
) {
  const normalizedQueueSourceUrl = normalizeSourceUrl(queueSourceUrl);
  const normalizedResolvedSourceUrl = resolvedSourceUrl
    ? normalizeSourceUrl(resolvedSourceUrl)
    : undefined;

  if (isUploadedAssetReference(normalizedQueueSourceUrl)) {
    return normalizedResolvedSourceUrl &&
      isUploadedSessionReference(normalizedResolvedSourceUrl)
      ? normalizedResolvedSourceUrl
      : null;
  }
  return normalizedResolvedSourceUrl ? null : normalizedQueueSourceUrl;
}
