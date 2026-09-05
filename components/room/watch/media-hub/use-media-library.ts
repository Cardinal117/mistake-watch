"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const generation = useRef(0);
  const refreshMediaLibrary = useCallback(async () => {
    const request = ++generation.current;
    setAssetLoading(true);
    setAssetError(null);
    try {
      const response = await fetch("/api/media/assets", { cache: "no-store" });
      const payload = (await response.json()) as {
        access?: MediaLibraryAccess;
        assets?: MediaLibraryAsset[];
        folders?: MediaFolder[];
        error?: string;
      };
      if (request !== generation.current) return;
      if (!response.ok)
        throw new Error(payload.error ?? "Media library could not load.");
      setLibraryAccess(payload.access ?? null);
      setAssets(
        payload.access?.canAccessUploadedCatalogue
          ? (payload.assets ?? [])
          : [],
      );
      setFolders(
        payload.access?.canAccessUploadedCatalogue
          ? (payload.folders ?? [])
          : [],
      );
    } catch (error) {
      if (request !== generation.current) return;
      setAssetError(
        error instanceof Error
          ? error.message
          : "Media library could not load.",
      );
      setLibraryAccess(null);
      setAssets([]);
      setFolders([]);
    } finally {
      if (request === generation.current) setAssetLoading(false);
    }
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void refreshMediaLibrary();
    });
    return () => {
      cancelAnimationFrame(frame);
      generation.current += 1;
    };
  }, [refreshMediaLibrary]);
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
