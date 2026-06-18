import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const envPath = path.join(process.cwd(), ".env.local");

await loadDotEnv(envPath);

const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const supabaseSecretKey = readRequiredEnv("SUPABASE_SECRET_KEY");
const r2Config = {
  accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
  endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/+$/, ""),
  publicBaseUrl: readRequiredEnv("CLOUDFLARE_R2_PUBLIC_BASE_URL").replace(/\/+$/, ""),
  secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
};

const assets = await fetchMissingPosterAssets();

if (assets.length === 0) {
  console.log("No ready media assets need poster backfill.");
  process.exit(0);
}

console.log(`Backfilling ${assets.length} poster thumbnail(s).`);

let completed = 0;

for (const asset of assets) {
  const tempFile = path.join(os.tmpdir(), `mistake-watch-poster-${asset.id}.jpg`);

  try {
    console.log(`- ${asset.title}`);
    await extractPoster(asset.public_url, tempFile);

    const objectKey = createR2PosterObjectKey({
      assetId: asset.id,
      ownerUserId: asset.owner_user_id,
    });
    const uploadUrl = createPresignedR2PutUrl({
      contentType: "image/jpeg",
      objectKey,
    });
    const posterBytes = await fs.readFile(tempFile);

    await uploadPoster(uploadUrl, posterBytes);

    const thumbnailUrl = getR2PublicUrl(objectKey);

    await updateAsset(asset.id, {
      poster_status: "ready",
      thumbnail_object_key: objectKey,
      thumbnail_url: thumbnailUrl,
    });

    completed += 1;
    console.log(`  ready: ${thumbnailUrl}`);
  } catch (error) {
    await updateAsset(asset.id, {
      poster_status: "failed",
    }).catch(() => undefined);
    console.error(
      `  failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
  }
}

console.log(`Poster backfill complete: ${completed}/${assets.length} updated.`);

async function fetchMissingPosterAssets() {
  const query = new URLSearchParams({
    order: "created_at.asc",
    select: "id,title,public_url,owner_user_id",
    status: "eq.ready",
    thumbnail_url: "is.null",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/media_assets?${query}`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Supabase asset query failed: ${response.status}`);
  }

  return response.json();
}

async function updateAsset(assetId, patch) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/media_assets?id=eq.${encodeURIComponent(assetId)}`,
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
    throw new Error(`Supabase asset update failed: ${response.status}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
  };
}

function extractPoster(sourceUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-ss",
      "00:00:08",
      "-i",
      sourceUrl,
      "-frames:v",
      "1",
      "-vf",
      "scale=1280:-2",
      "-q:v",
      "3",
      "-y",
      outputPath,
    ]);
    let stderr = "";

    ffmpeg.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

async function uploadPoster(uploadUrl, posterBytes) {
  const response = await fetch(uploadUrl, {
    body: posterBytes,
    headers: {
      "Content-Type": "image/jpeg",
    },
    method: "PUT",
  });

  if (!response.ok) {
    throw new Error(`R2 poster upload failed: ${response.status}`);
  }
}

function createR2PosterObjectKey(input) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-posters/${input.ownerUserId}/${day}/${input.assetId}.jpg`;
}

function getR2PublicUrl(objectKey) {
  return `${r2Config.publicBaseUrl}/${objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function createPresignedR2PutUrl(input) {
  return signR2Url({
    contentType: input.contentType,
    expiresSeconds: 15 * 60,
    method: "PUT",
    objectKey: input.objectKey,
  });
}

function signR2Url(input) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const endpoint = new URL(r2Config.endpoint);
  const canonicalUri = `/${r2Config.bucket}/${input.objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
  const signedHeaders = "content-type;host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${r2Config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQueryString = Array.from(query.entries())
    .sort(([left], [right]) => left.localeCompare(right))
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
  const signature = crypto
    .createHmac(
      "sha256",
      getSignatureKey(r2Config.secretAccessKey, dateStamp, "auto", "s3"),
    )
    .update(stringToSign)
    .digest("hex");

  query.set("X-Amz-Signature", signature);

  return `${endpoint.origin}${canonicalUri}?${query.toString()}`;
}

async function loadDotEnv(filePath) {
  const content = await fs.readFile(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
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
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
