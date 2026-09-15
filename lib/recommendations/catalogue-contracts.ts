export const CATALOGUE_BATCH_SIZE = 50;
export const CATALOGUE_DAILY_LIMIT = 100;
export const CATALOGUE_TTL_MS = 28 * 86400000;
export const CATALOGUE_MEDIA_ID = /^[A-Za-z0-9_-]{6,64}$/;

export type CatalogueMetadata = {
  mediaId: string;
  title: string;
  channelTitle: string | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  fetchedAt: string;
  expiresAt: string;
};
export type CatalogueResult =
  | { mediaId: string; status: "unavailable" | "transient_failure" }
  | (Omit<CatalogueMetadata, "fetchedAt" | "expiresAt"> & {
      status: "public";
      viewCount: number | null;
      likeCount: number | null;
      allowedCountries?: string[] | null;
      blockedCountries?: string[] | null;
    });

export function catalogueObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid catalogue object");
  return value as Record<string, unknown>;
}
export function catalogueCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
export function catalogueDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export type CatalogueMaintenanceResult = {
  status: "busy" | "not_due" | "completed";
  catalogueDeleted: number;
  shadowDeleted: number;
  shadowBatches: number;
  backlogPossible: boolean;
  nextDueAt: string | null;
};

export function parseCatalogueMaintenanceResult(
  value: unknown,
): CatalogueMaintenanceResult {
  const row = catalogueObject(value);
  const skipped = row.status === "busy" || row.status === "not_due";
  const shadowBatches = Number(row.shadowBatches);
  const shadowDeleted = Number(row.shadowDeleted);
  const validShadowWork =
    shadowBatches === 0
      ? shadowDeleted === 0
      : shadowBatches <= 24 &&
        shadowDeleted >= (shadowBatches - 1) * 512 + 1 &&
        shadowDeleted <= shadowBatches * 512;
  const allowed = [
    "status",
    "catalogueDeleted",
    "shadowDeleted",
    "shadowBatches",
    "backlogPossible",
    "nextDueAt",
  ];
  if (
    Object.keys(row).length !== allowed.length ||
    Object.keys(row).some((key) => !allowed.includes(key)) ||
    !["busy", "not_due", "completed"].includes(String(row.status)) ||
    !catalogueCount(row.catalogueDeleted) ||
    !catalogueCount(row.shadowDeleted) ||
    !catalogueCount(row.shadowBatches) ||
    typeof row.backlogPossible !== "boolean" ||
    (skipped &&
      (row.catalogueDeleted !== 0 ||
        row.shadowDeleted !== 0 ||
        row.shadowBatches !== 0 ||
        row.backlogPossible !== false)) ||
    (row.status === "completed" &&
      (Number(row.catalogueDeleted) > 16_384 ||
        !validShadowWork ||
        ((Number(row.catalogueDeleted) === 16_384 ||
          (shadowBatches === 24 && shadowDeleted === 12_288)) &&
          row.backlogPossible !== true))) ||
    !(
      (row.status === "busy" && row.nextDueAt === null) ||
      (row.status !== "busy" && catalogueDate(row.nextDueAt))
    )
  )
    throw new Error("Invalid catalogue maintenance result");
  return row as CatalogueMaintenanceResult;
}
export function catalogueThumbnail(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      (url.hostname === "i.ytimg.com" ||
        /^i\d+\.ytimg\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}
export function parseCatalogueMetadata(
  value: unknown,
  now: number,
): CatalogueMetadata {
  const row = catalogueObject(value);
  const allowed = [
    "mediaId",
    "title",
    "channelTitle",
    "durationSeconds",
    "thumbnailUrl",
    "fetchedAt",
    "expiresAt",
  ];
  if (
    Object.keys(row).some((key) => !allowed.includes(key)) ||
    typeof row.mediaId !== "string" ||
    !CATALOGUE_MEDIA_ID.test(row.mediaId) ||
    typeof row.title !== "string" ||
    !row.title.trim() ||
    row.title.length > 500 ||
    !(
      row.channelTitle === null ||
      (typeof row.channelTitle === "string" && row.channelTitle.length <= 200)
    ) ||
    !(row.durationSeconds === null || catalogueCount(row.durationSeconds)) ||
    !catalogueThumbnail(row.thumbnailUrl) ||
    !catalogueDate(row.fetchedAt) ||
    !catalogueDate(row.expiresAt) ||
    Date.parse(row.fetchedAt) > now ||
    Date.parse(row.expiresAt) <= Date.parse(row.fetchedAt) ||
    Date.parse(row.expiresAt) - Date.parse(row.fetchedAt) > CATALOGUE_TTL_MS
  )
    throw new Error("Invalid catalogue metadata");
  return row as CatalogueMetadata;
}
