"use client";

import { useEffect, useState } from "react";

import type {
  MediaFolder,
  MediaLibraryAccess,
  MediaLibraryAsset,
} from "../contracts";

export function useMediaLibrary() {
  const [assets, setAssets] = useState<MediaLibraryAsset[]>([]);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetLoading, setAssetLoading] = useState(true);
  const [libraryAccess, setLibraryAccess] = useState<MediaLibraryAccess | null>(
    null,
  );
  const [folders, setFolders] = useState<MediaFolder[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAssets() {
      setAssetLoading(true);
      setAssetError(null);

      try {
        const response = await fetch("/api/media/assets", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          access?: MediaLibraryAccess;
          assets?: MediaLibraryAsset[];
          error?: string;
          folders?: MediaFolder[];
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Media library could not load.");
        }

        if (!cancelled) {
          setLibraryAccess(payload.access ?? null);
          setAssets(payload.assets ?? []);
          setFolders(payload.folders ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setAssetError(
            error instanceof Error
              ? error.message
              : "Media library could not load.",
          );
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false);
        }
      }
    }

    void loadAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshMediaLibrary() {
    const response = await fetch("/api/media/assets", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      access?: MediaLibraryAccess;
      assets?: MediaLibraryAsset[];
      error?: string;
      folders?: MediaFolder[];
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Media library could not load.");
    }

    setLibraryAccess(payload.access ?? null);
    setAssets(payload.assets ?? []);
    setFolders(payload.folders ?? []);
  }

  return {
    assetError,
    assetLoading,
    assets,
    folders,
    libraryAccess,
    refreshMediaLibrary,
    setAssets,
    setFolders,
  };
}
