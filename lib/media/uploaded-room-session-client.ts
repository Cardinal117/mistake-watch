import { createUploadedSessionReference } from "./uploaded-playback-reference";

export async function createUploadedPlaybackSessionReference(input: {
  assetId: string;
  roomId: string;
}) {
  const response = await fetch("/api/media/room-sessions", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: string;
    session?: { assetId: string; id: string };
  };

  if (!response.ok || !payload.session) {
    throw new Error(payload.error ?? "Uploaded media session could not start.");
  }

  if (payload.session.assetId !== input.assetId) {
    throw new Error("Uploaded media session did not match the queued asset.");
  }

  return createUploadedSessionReference(payload.session.id);
}
