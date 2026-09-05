import type { MediaLibraryAsset } from "@/components/room/watch/contracts";

export const previewTitles = [
  "Afterlight",
  "The Long Way Home",
  "Into the Canopy",
  "Building Other Worlds",
  "Blue Hour",
  "The Quiet Coast",
  "Signal / Noise",
  "Beyond the Ridge",
  "Night Shift",
  "Where We Wander",
  "The Last Light",
  "A Different Orbit",
];
export function previewArtwork(index: number) {
  const colors = [
    ["#20264e", "#f1a985"],
    ["#163c40", "#e3c892"],
    ["#123629", "#9caf68"],
    ["#373153", "#a598db"],
  ];
  const [sky, light] = colors[index % colors.length];
  const city = index % 4 === 0 || index % 4 === 3;
  const silhouette = city
    ? '<path d="M0 215V135H35V175H60V85H105V150H130V65H165V140H190V100H220V170H252V50H278V120H318V178H356V95H389V130H420V170H455V110H495V185H530V145H565V210H640V360H0Z" fill="#101521"/><path d="M70 105h22v3H70zm70-15h15v3h-15zm122-17h7v26h-7zm105 55h12v3h-12z" fill="#e2b6bc"/>'
    : '<path d="M0 245 155 94 259 208 360 106 530 245 640 155V360H0Z" fill="#1c3434"/><path d="m0 290 185-109 202 107 123-89 130 84v77H0Z" fill="#112629"/>';
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="' +
        sky +
        '"/><stop offset="1" stop-color="' +
        light +
        '"/></linearGradient></defs><path fill="url(#s)" d="M0 0h640v360H0z"/><circle cx="' +
        (450 - (index % 3) * 100) +
        '" cy="109" r="47" fill="' +
        light +
        '" opacity=".8"/>' +
        silhouette +
        '<path d="M0 310Q180 290 320 310T640 318V360H0Z" fill="#080f18"/><text x="28" y="320" fill="#f3ebe1" font-family="sans-serif" font-weight="700" font-size="27" letter-spacing="3">' +
        previewTitles[index % previewTitles.length].toUpperCase() +
        "</text></svg>",
    )
  );
}
export function previewCatalogue(count = 36) {
  return {
    access: {
      allowed: true,
      canAccessUploadedCatalogue: true,
      scope: "allowlisted",
      reason: "active_allowlist",
      message: "Preview catalogue",
    },
    assets: Array.from(
      { length: count },
      (_, index) =>
        ({
          id: "00000000-0000-4000-8000-" + String(index + 10).padStart(12, "0"),
          title:
            previewTitles[index % previewTitles.length] +
            (index >= 12 ? " · " + (Math.floor(index / 12) + 1) : ""),
          status: "ready",
          thumbnailUrl: previewArtwork(index),
          durationSeconds: 60 + index * 30,
          folderId: ["cinema", "journeys", "creative"][index % 3],
          sourceMatches: [],
          createdAt: "2026-09-01T12:00:00Z",
          mediaKind: "video",
          mimeType: "video/webm",
          visibility: "private",
          fileSizeBytes: 1000000,
          contentUrl: null,
          isLive: false,
          posterStatus: "ready",
          waveformStatus: "skipped",
          waveformPeaksUrl: null,
          processingStatus: "ready",
          processingStrategy: "passthrough",
          processingErrorMessage: null,
          processingJobId: null,
          processingRequiresApproval: false,
          processingEstimatedCredits: null,
          processingDecisionReason: null,
        }) satisfies MediaLibraryAsset,
    ),
    folders: ["Cinema nights", "Out there", "Made of ideas"].map(
      (name, index) => ({
        id: ["cinema", "journeys", "creative"][index],
        name,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
        defaultSortDirection: "desc",
        defaultSortKey: "created_at",
        description: null,
        folderType: "custom",
        sortOrder: index,
      }),
    ),
  };
}
