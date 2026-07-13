import type { ClientMediaInspection } from "../contracts";

export function captureVideoPoster(sourceUrl: string) {
  return new Promise<Blob>((resolve, reject) => {
    const video = document.createElement("video");
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };
    const fail = () => {
      cleanup();
      reject(new Error("Poster capture failed."));
    };

    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = sourceUrl;
    video.onerror = fail;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(Math.max(duration * 0.1, 1), 8);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const context = canvas.getContext("2d");

      if (!context) {
        fail();
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Poster capture produced no image."));
        },
        "image/jpeg",
        0.82,
      );
    };
  });
}

export async function readUploadDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (durationSeconds: number | null) => {
      cleanup();
      resolve(durationSeconds);
    };

    video.preload = "metadata";
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      finish(
        Number.isFinite(video.duration) && video.duration > 0
          ? Math.floor(video.duration)
          : null,
      );
    };
    video.onerror = () => finish(null);
  });
}

export async function inspectUploadFile(
  file: File,
): Promise<ClientMediaInspection> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const container =
    extension === "mp4" || extension === "m4v" || file.type === "video/mp4"
      ? "mp4"
      : extension || null;
  const baseInspection: ClientMediaInspection = {
    audioCodecs: [],
    container,
    isBrowserSafe: false,
    notes: [],
    videoCodecs: [],
  };

  if (container !== "mp4") {
    return {
      ...baseInspection,
      notes: ["Non-MP4 upload requires conversion."],
    };
  }

  const sample = await readFileSample(file);
  const videoCodecs = readPresentCodecs(sample, [
    "av01",
    "avc1",
    "hev1",
    "hvc1",
    "vp09",
  ]);
  const audioCodecs = readPresentCodecs(sample, [
    "ac-3",
    "dts",
    "ec-3",
    "fLaC",
    "mp4a",
    "Opus",
  ]).map((codec) => codec.toLowerCase());
  const safe =
    videoCodecs.some((codec) => codec.startsWith("avc1")) &&
    audioCodecs.some((codec) => codec.startsWith("mp4a")) &&
    !videoCodecs.some((codec) =>
      ["av01", "hev1", "hvc1", "vp09"].some((unsafe) =>
        codec.startsWith(unsafe),
      ),
    ) &&
    !audioCodecs.some((codec) =>
      ["ac-3", "dts", "ec-3", "flac", "opus"].some((unsafe) =>
        codec.startsWith(unsafe),
      ),
    );

  return {
    audioCodecs,
    container,
    isBrowserSafe: safe,
    notes: safe
      ? ["MP4 preflight found browser-safe H.264/AAC markers."]
      : ["MP4 preflight could not prove browser-safe H.264/AAC."],
    videoCodecs,
  };
}

async function readFileSample(file: File) {
  const headSize = Math.min(file.size, 16 * 1024 * 1024);
  const tailSize =
    file.size > headSize ? Math.min(file.size - headSize, 4 * 1024 * 1024) : 0;
  const chunks = [file.slice(0, headSize)];

  if (tailSize > 0) {
    chunks.push(file.slice(file.size - tailSize, file.size));
  }

  const buffers = await Promise.all(chunks.map((chunk) => chunk.arrayBuffer()));
  const merged = new Uint8Array(
    buffers.reduce((total, buffer) => total + buffer.byteLength, 0),
  );
  let offset = 0;

  for (const buffer of buffers) {
    merged.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  return merged;
}

function readPresentCodecs(sample: Uint8Array, codecMarkers: string[]) {
  return codecMarkers.filter((marker) => includesAscii(sample, marker));
}

function includesAscii(sample: Uint8Array, marker: string) {
  const needle = Array.from(marker).map((char) => char.charCodeAt(0));

  outer: for (
    let index = 0;
    index <= sample.length - needle.length;
    index += 1
  ) {
    for (let needleIndex = 0; needleIndex < needle.length; needleIndex += 1) {
      if (sample[index + needleIndex] !== needle[needleIndex]) {
        continue outer;
      }
    }

    return true;
  }

  return false;
}
