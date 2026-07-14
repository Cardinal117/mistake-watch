import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

loadDotEnv(path.join(process.cwd(), ".env.local"));

const ownerUserId = process.env.MEDIA_INGEST_OWNER_USER_ID;
const folderId = process.env.MEDIA_INGEST_FOLDER_ID || null;
const sourcePaths = process.argv.slice(2);

if (!ownerUserId || sourcePaths.length === 0) {
  console.error(
    "Usage: MEDIA_INGEST_OWNER_USER_ID=<user-id> [MEDIA_INGEST_FOLDER_ID=<folder-id>] node scripts/ingest-local-media-assets.mjs <file...>",
  );
  process.exit(1);
}

const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(
  /\/+$/,
  "",
);
const supabaseSecretKey = readRequiredEnv("SUPABASE_SECRET_KEY");
const r2Config = {
  accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
  endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/+$/, ""),
  secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
};

for (const sourcePath of sourcePaths) {
  await ingestFile(path.resolve(sourcePath));
}

async function ingestFile(sourcePath) {
  const sourceStat = await fsp.stat(sourcePath);

  if (!sourceStat.isFile()) {
    throw new Error(`Not a file: ${sourcePath}`);
  }

  const assetId = crypto.randomUUID();
  const title = deriveMediaTitle(path.basename(sourcePath));
  const tempDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), "mistake-watch-ingest-"),
  );
  const outputPath = path.join(tempDir, `${assetId}.browser.mp4`);
  const posterPath = path.join(tempDir, `${assetId}.jpg`);

  try {
    console.log(`Processing: ${title}`);
    console.log(`Source: ${sourcePath}`);
    await transcodeBrowserMp4(sourcePath, outputPath);
    const outputStat = await fsp.stat(outputPath);
    const durationSeconds = await readDurationSeconds(outputPath);
    const processedObjectKey = createProcessedObjectKey({
      assetId,
      fileName: path.basename(sourcePath),
      ownerUserId,
    });

    console.log(`Uploading processed MP4 (${formatBytes(outputStat.size)})...`);
    await uploadFileToR2({
      contentType: "video/mp4",
      filePath: outputPath,
      objectKey: processedObjectKey,
    });

    console.log("Generating poster...");
    await extractPoster(outputPath, posterPath);
    const posterObjectKey = createPosterObjectKey({ assetId, ownerUserId });

    await uploadFileToR2({
      contentType: "image/jpeg",
      filePath: posterPath,
      objectKey: posterObjectKey,
    });

    const processedReference = getPrivateR2Reference(processedObjectKey);
    const posterReference = getPrivateR2Reference(posterObjectKey);

    await insertAsset({
      id: assetId,
      duration_seconds: durationSeconds,
      file_size_bytes: outputStat.size,
      folder_id: folderId,
      is_live: false,
      media_kind: "video",
      mime_type: "video/mp4",
      owner_user_id: ownerUserId,
      poster_status: "ready",
      public_url: processedReference,
      r2_bucket: r2Config.bucket,
      r2_object_key: processedObjectKey,
      source_type: "r2_object",
      status: "ready",
      thumbnail_object_key: posterObjectKey,
      thumbnail_url: posterReference,
      title,
      visibility: "public",
    });

    console.log(`Asset ID: ${assetId}`);
    console.log(`Processed URL: ${processedUrl}`);
    console.log(`Poster URL: ${posterUrl}`);
    console.log("Asset ingested.");
  } finally {
    await fsp
      .rm(tempDir, { force: true, recursive: true })
      .catch(() => undefined);
  }
}

async function insertAsset(asset) {
  const response = await fetch(`${supabaseUrl}/rest/v1/media_assets`, {
    body: JSON.stringify(asset),
    headers: {
      ...supabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(`Supabase asset insert failed: ${response.status} ${body}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
  };
}

function transcodeBrowserMp4(sourcePath, outputPath) {
  return runFfmpeg([
    "-hide_banner",
    "-y",
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-dn",
    "-sn",
    "-vf",
    "scale=w='min(1920,iw)':h=-2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-preset",
    "medium",
    "-crf",
    "21",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

function extractPoster(inputPath, outputPath) {
  return runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    "00:00:08",
    "-i",
    inputPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=1280:-2",
    "-q:v",
    "3",
    "-y",
    outputPath,
  ]);
}

function readDurationSeconds(inputPath) {
  return new Promise((resolve) => {
    const probe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);
    let output = "";

    probe.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    probe.on("error", () => resolve(null));
    probe.on("close", () => {
      const duration = Number(output.trim());

      resolve(Number.isFinite(duration) ? Math.round(duration) : null);
    });
  });
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args);
    let lastLine = "";

    ffmpeg.stderr.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (!line.trim()) {
          continue;
        }

        lastLine = line;
        if (
          line.includes("time=") ||
          line.includes("frame=") ||
          line.includes("speed=")
        ) {
          console.log(line.trim());
        }
      }
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(lastLine || `ffmpeg exited with code ${code}`));
    });
  });
}

async function uploadFileToR2(input) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await uploadFileToR2Once(input);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `R2 upload attempt ${attempt} failed; retrying in ${attempt * 2}s...`,
      );
      await delay(attempt * 2000);
    }
  }
}

async function uploadFileToR2Once(input) {
  const stat = await fsp.stat(input.filePath);
  const uploadUrl = signR2Url({
    config: r2Config,
    contentType: input.contentType,
    expiresSeconds: 15 * 60,
    method: "PUT",
    objectKey: input.objectKey,
  });
  const stream = fs.createReadStream(input.filePath);
  const response = await fetch(uploadUrl, {
    body: Readable.toWeb(stream),
    duplex: "half",
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": input.contentType,
    },
    method: "PUT",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(`R2 upload failed: ${response.status} ${body}`);
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createProcessedObjectKey(input) {
  const day = new Date().toISOString().slice(0, 10);
  const baseName = slugify(input.fileName.replace(/\.[^/.]+$/, ""));

  return `media-processed/${input.ownerUserId}/${day}/${input.assetId}-${baseName}.browser.mp4`;
}

function createPosterObjectKey(input) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-posters/${input.ownerUserId}/${day}/${input.assetId}.jpg`;
}

function getPrivateR2Reference(objectKey) {
  return `r2-private://${encodeURIComponent(r2Config.bucket)}/${objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function signR2Url(input) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const service = "s3";
  const region = "auto";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const endpoint = new URL(input.config.endpoint);
  const canonicalUri = `/${input.config.bucket}/${input.objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
  const signedHeaders = "content-type;host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQueryString = Array.from(query.entries())
    .sort(([left], [right]) => {
      if (left < right) {
        return -1;
      }

      if (left > right) {
        return 1;
      }

      return 0;
    })
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
  const canonicalHeaders = `content-type:${input.contentType}\nhost:${endpoint.host}\n`;
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(
    input.config.secretAccessKey,
    dateStamp,
    region,
    service,
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  query.set("X-Amz-Signature", signature);

  return `${endpoint.origin}${canonicalUri}?${query.toString()}`;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    process.env[key] ??= value;
  }
}

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function deriveMediaTitle(fileName) {
  return (
    fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Uploaded video"
  );
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "media"
  );
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function hashHex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function getSignatureKey(secretAccessKey, dateStamp, regionName, serviceName) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, regionName);
  const dateRegionServiceKey = hmac(dateRegionKey, serviceName);

  return hmac(dateRegionServiceKey, "aws4_request");
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
