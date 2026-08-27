import assert from "node:assert/strict";
import test from "node:test";

import { loadRecommendationModule } from "./ranking-test-helpers.mjs";

const {
  activeMediaPreferenceItem,
  buildRoomRecommendationRequest,
  queueItemRecommendationIdentity,
} = await loadRecommendationModule("room-client.ts");

test("room client emits bounded opaque identities without source URLs", () => {
  const request = buildRoomRecommendationRequest({
    candidates: [youtubeItem("provider:hmJPbHVK-co", "queued")],
    currentItem: youtubeItem("current:9bZkp7q19f0", "now"),
    items: [
      youtubeItem("queued:dQw4w9WgXcQ", "queued"),
      uploadedItem("00000000-0000-4000-8000-000000000021", "played"),
    ],
    roomId: ROOM_ID,
  });
  const serialized = JSON.stringify(request);

  assert.equal(request.candidates[0].mediaId, "hmJPbHVK-co");
  assert.equal(request.currentMedia.mediaId, "9bZkp7q19f0");
  assert.equal(request.recentHistory[0].sourceType, "uploaded");
  assert.equal(request.limit, 8);
  assert.match(request.revision, /^v1-[a-z0-9]+$/);
  assert.doesNotMatch(serialized, /sourceUrl|youtube\.com|mw-uploaded-asset/);
});

test("room client derives direct identities from queue ids, not destinations", () => {
  const identity = queueItemRecommendationIdentity({
    id: "queue-item-7",
    sourceType: "hls",
    sourceUrl: "https://private.example/live/manifest.m3u8?token=secret",
  });

  assert.deepEqual(identity, {
    mediaId: "queue:queue-item-7",
    sourceType: "hls",
  });
});

test("directly loaded YouTube media gets a canonical preference target", () => {
  const directItem = activeMediaPreferenceItem({
    currentItem: null,
    sourceTitle: "Direct fixture",
    sourceType: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=hmJPbHVK-co",
  });

  assert.equal(directItem.id, "active:hmJPbHVK-co");
  assert.equal(directItem.title, "Direct fixture");
  assert.deepEqual(queueItemRecommendationIdentity(directItem), {
    mediaId: "hmJPbHVK-co",
    sourceType: "youtube",
  });
});

test("canonical active YouTube identity wins over a stale queue row", () => {
  const staleItem = youtubeItem("current:9bZkp7q19f0", "now");
  const activeItem = activeMediaPreferenceItem({
    currentItem: staleItem,
    sourceTitle: "Active fixture",
    sourceType: "youtube",
    sourceUrl: "https://youtu.be/hmJPbHVK-co",
  });

  assert.notEqual(activeItem, staleItem);
  assert.equal(activeItem.id, "active:hmJPbHVK-co");
  assert.equal(
    activeMediaPreferenceItem({
      currentItem: staleItem,
      sourceTitle: staleItem.title,
      sourceType: staleItem.sourceType,
      sourceUrl: staleItem.sourceUrl,
    }),
    staleItem,
  );
});

test("non-YouTube media keeps its existing queue-backed preference target", () => {
  const currentItem = {
    id: "direct-queue-item",
    sourceType: "direct",
    sourceUrl: "mw-uploaded-asset:00000000-0000-4000-8000-000000000021",
    status: "now",
    title: "Private fixture",
  };

  assert.equal(
    activeMediaPreferenceItem({
      currentItem,
      sourceTitle: "Direct fixture",
      sourceType: "direct",
      sourceUrl: "mw-uploaded-session:00000000-0000-4000-8000-000000000022",
    }),
    currentItem,
  );
});

test("missing session source metadata preserves the queue-backed preference target", () => {
  const currentItem = youtubeItem("current:hmJPbHVK-co", "now");

  assert.equal(
    activeMediaPreferenceItem({
      currentItem,
      sourceTitle: null,
      sourceType: null,
      sourceUrl: null,
    }),
    currentItem,
  );
});

function youtubeItem(id, status) {
  const videoId = id.split(":").at(-1);

  return {
    id,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    status,
    title: `Fixture ${videoId}`,
  };
}

function uploadedItem(assetId, status) {
  return {
    id: `uploaded:${assetId}`,
    sourceType: "direct",
    sourceUrl: `mw-uploaded-asset:${assetId}`,
    status,
    title: "Private fixture",
  };
}

const ROOM_ID = "00000000-0000-4000-8000-000000000003";
