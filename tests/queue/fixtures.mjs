const VALID_VIDEO_ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

export function createQueueFixture(size) {
  if (!Number.isInteger(size) || size < 0) {
    throw new TypeError("Queue fixture size must be a non-negative integer.");
  }

  return Array.from({ length: size }, (_, index) => {
    const status = index === 0 ? "now" : index % 7 === 0 ? "played" : "queued";
    const videoId = createVideoId(index);

    return {
      addedBy: `Member ${index % 5}`,
      artist: `Artist ${index % 17}`,
      channelName: `Channel ${index % 13}`,
      duration: `${3 + (index % 7)}:${String(index % 60).padStart(2, "0")}`,
      durationSeconds: 180 + (index % 420),
      id: `queue-${String(index).padStart(4, "0")}`,
      isPinned: index > 0 && index % 41 === 0,
      isPlayNext: index > 0 && index % 53 === 0,
      playedSequence: status === "played" ? Math.floor(index / 7) : undefined,
      sourceType: "youtube",
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      status,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title: `Fixture queue item ${index + 1}`,
      videoId,
    };
  });
}

export const queueFixtureSizes = Object.freeze([0, 1, 10, 250, 1000]);

function createVideoId(value) {
  let remaining = value;
  let output = "";

  for (let index = 0; index < 11; index += 1) {
    output = VALID_VIDEO_ID_ALPHABET[remaining % VALID_VIDEO_ID_ALPHABET.length] + output;
    remaining = Math.floor(remaining / VALID_VIDEO_ID_ALPHABET.length);
  }

  return output;
}
