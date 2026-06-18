import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

loadDotEnv(path.join(process.cwd(), ".env.local"));

const assetId = process.argv[2];

if (!assetId) {
  console.error("Usage: node scripts/process-r2-media-asset.mjs <asset-id>");
  process.exit(1);
}

const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const supabaseSecretKey = readRequiredEnv("SUPABASE_SECRET_KEY");
const r2Config = {
  accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
  endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/+$/, ""),
  publicBaseUrl: readRequiredEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
  secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
};

const asset = await fetchAsset(assetId);
const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "mistake-watch-process-"));
const outputPath = path.join(tempDir, `${asset.id}.browser.mp4`);
const posterPath = path.join(tempDir, `${asset.id}.jpg`);

try {
  console.log(`Processing: ${asset.title}`);
  console.log(`Source: ${asset.public_url}`);
  await transcodeBrowserMp4(asset.public_url, outputPath);
  const outputStat = await fsp.stat(outputPath);
  const durationSeconds = await readDurationSeconds(outputPath);
  const processedObjectKey = createProcessedObjectKey(asset);

  console.log(`Uploading processed MP4 (${formatBytes(outputStat.size)})...`);
  await uploadFileToR2({
    contentType: "video/mp4",
    filePath: outputPath,
    objectKey: processedObjectKey,
  });

  console.log("Generating poster...");
  await extractPoster(outputPath, posterPath);
  const posterObjectKey = createPosterObjectKey(asset);

  await uploadFileToR2({
    contentType: "image/jpeg",
    filePath: posterPath,
    objectKey: posterObjectKey,
  });

  const processedUrl = getR2PublicUrl(processedObjectKey);
  const posterUrl = getR2PublicUrl(posterObjectKey);

  await updateAsset(asset.id, {
    duration_seconds: durationSeconds,
    file_size_bytes: outputStat.size,
    mime_type: "video/mp4",
    poster_status: "ready",
    public_url: processedUrl,
    r2_object_key: processedObjectKey,
    status: "ready",
    thumbnail_object_key: posterObjectKey,
    thumbnail_url: posterUrl,
  });

  console.log(`Processed URL: ${processedUrl}`);
  console.log(`Poster URL: ${posterUrl}`);
  console.log("Asset repaired.");
} finally {
  await fsp.rm(tempDir, { force: true, recursive: true }).catch(() => undefined);
}

async function fetchAsset(id) {
  const query = new URLSearchParams({
    id: `eq.${id}`,
    select: "id,title,owner_user_id,public_url,r2_object_key",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/media_assets?${query}`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Supabase asset query failed: ${response.status}`);
  }

  const rows = await response.json();
  const asset = rows[0];

  if (!asset) {
    throw new Error(`Media asset not found: ${id}`);
  }

  return asset;
}

async function updateAsset(id, patch) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/media_assets?id=eq.${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(patch),
      headers: {
        ...supabaseHeaders(),
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      method: "PATCH",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(`Supabase asset update failed: ${response.status} ${body}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
  };
}

function transcodeBrowserMp4(sourceUrl, outputPath) {
  return runFfmpeg([
    "-hide_banner",
    "-y",
    "-i",
    sourceUrl,
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
    "512k",
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

function createProcessedObjectKey(asset) {
  const sourceKey = asset.r2_object_key || `media/${asset.owner_user_id}/${asset.id}.mp4`;
  const base = sourceKey
    .replace(/^media\//, "media-processed/")
    .replace(/\.[^/.]+$/, "");

  return `${base}.browser.mp4`;
}

function createPosterObjectKey(asset) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-posters/${asset.owner_user_id}/${day}/${asset.id}.jpg`;
}

function getR2PublicUrl(objectKey) {
  return `${r2Config.publicBaseUrl}/${objectKey
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
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

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
