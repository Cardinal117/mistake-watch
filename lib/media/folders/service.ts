import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";

import {
  MediaAssetError,
  type MediaFolder,
  type MediaFolderSortDirection,
  type MediaFolderSortKey,
} from "../contracts";
import { requireOwnerSummary } from "../shared";

export async function createMediaFolder(input: {
  folderType?: string;
  name: string;
}) {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const name = normalizeFolderName(input.name);
  const slug = await createAvailableFolderSlug(name, owner.id);
  const { data, error } = await admin
    .from("media_folders")
    .insert({
      folder_type: normalizeFolderType(input.folderType),
      name,
      owner_user_id: owner.id,
      slug,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toMediaFolder(data);
}

export async function updateMediaFolderSort(input: {
  folderId: string;
  sortDirection: string;
  sortKey: string;
}) {
  const owner = await requireOwnerSummary();
  const sortKey = normalizeFolderSortKey(input.sortKey);
  const sortDirection = normalizeFolderSortDirection(input.sortDirection);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .update({
      default_sort_direction: sortDirection,
      default_sort_key: sortKey,
    })
    .eq("id", input.folderId)
    .eq("owner_user_id", owner.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return toMediaFolder(data);
}

export async function listMediaFolders() {
  const owner = await requireOwnerSummary();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .select()
    .eq("owner_user_id", owner.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(toMediaFolder);
}

export async function assertOwnerFolder(folderId: string, ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_folders")
    .select("id")
    .eq("id", folderId)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new MediaAssetError("Media folder was not found.", 404);
  }

  return data.id;
}

export async function resolveOwnerFolderId(input: {
  folderId?: string | null;
  folderName?: string | null;
  ownerUserId: string;
}) {
  if (input.folderId) {
    return assertOwnerFolder(input.folderId, input.ownerUserId);
  }

  const folderName = normalizeOptionalFolderName(input.folderName);

  if (!folderName) {
    return null;
  }

  const admin = createSupabaseAdminClient();
  const slug = await createAvailableFolderSlug(folderName, input.ownerUserId);
  const { data, error } = await admin
    .from("media_folders")
    .insert({
      folder_type: "series",
      name: folderName,
      owner_user_id: input.ownerUserId,
      slug,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

export function toMediaFolder(folder: Tables<"media_folders">): MediaFolder {
  return {
    createdAt: folder.created_at,
    defaultSortDirection: normalizeFolderSortDirection(
      folder.default_sort_direction,
    ),
    defaultSortKey: normalizeFolderSortKey(folder.default_sort_key),
    description: folder.description,
    folderType: folder.folder_type,
    id: folder.id,
    name: folder.name,
    sortOrder: folder.sort_order,
    updatedAt: folder.updated_at,
  };
}

async function createAvailableFolderSlug(name: string, ownerUserId: string) {
  const admin = createSupabaseAdminClient();
  const baseSlug = slugifyFolderName(name);
  let slug = baseSlug;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const { data, error } = await admin
      .from("media_folders")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${attempt + 1}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

function normalizeFolderName(name: string) {
  const normalized = normalizeOptionalFolderName(name);

  if (!normalized) {
    throw new MediaAssetError("Folder name is required.", 400);
  }

  return normalized;
}

function normalizeOptionalFolderName(name: string | null | undefined) {
  const normalized = name?.trim().replace(/\s+/g, " ").slice(0, 120);

  return normalized || null;
}

function normalizeFolderType(folderType: string | undefined) {
  return folderType === "series" || folderType === "general"
    ? folderType
    : "collection";
}

function normalizeFolderSortKey(sortKey: string): MediaFolderSortKey {
  if (
    sortKey === "created_at" ||
    sortKey === "duration_seconds" ||
    sortKey === "name"
  ) {
    return sortKey;
  }

  throw new MediaAssetError("Unsupported folder sort key.", 400);
}

function normalizeFolderSortDirection(
  direction: string,
): MediaFolderSortDirection {
  if (direction === "asc" || direction === "desc") {
    return direction;
  }

  throw new MediaAssetError("Unsupported folder sort direction.", 400);
}

function slugifyFolderName(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96) || "media-folder"
  );
}
