import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

loadDotEnv(path.join(process.cwd(), ".env.local"));

const assetIds = process.argv.slice(2);

if (assetIds.length === 0) {
  console.error("Usage: node scripts/delete-media-assets.mjs <asset-id...>");
  process.exit(1);
}

const supabaseUrl = readRequiredEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/+$/, "");
const supabaseSecretKey = readRequiredEnv("SUPABASE_SECRET_KEY");
const r2Config = {
  accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
  endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/+$/, ""),
  secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
};

const assets = await fetchAssets(assetIds);
const foundIds = new Set(assets.map((asset) => asset.id));
const missingIds = assetIds.filter((assetId) => !foundIds.has(assetId));

if (missingIds.length > 0) {
  throw new Error(`Asset IDs not found: ${missingIds.join(", ")}`);
}

for (const asset of assets) {
  console.log(`Deleting asset: ${asset.title} (${asset.id})`);
  const objectKeys = Array.from(
    new Set(
      [asset.r2_object_key, asset.thumbnail_object_key].filter(
        (objectKey) => typeof objectKey === "string" && objectKey.length > 0,
      ),
    ),
  );

  for (const objectKey of objectKeys) {
    await deleteR2Object(objectKey);
    console.log(`Deleted R2 object: ${objectKey}`);
  }

  await deleteAssetRow(asset.id);
  console.log(`Deleted media_assets row: ${asset.id}`);
}

async function fetchAssets(ids) {
  const query = new URLSearchParams({
    id: `in.(${ids.join(",")})`,
    select: "id,title,r2_object_key,thumbnail_object_key",
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/media_assets?${query}`, {
    headers: supabaseHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(`Asset lookup failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function deleteAssetRow(assetId) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/media_assets?id=eq.${encodeURIComponent(assetId)}`,
    {
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=minimal",
      },
      method: "DELETE",
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(`Asset row delete failed: ${response.status} ${body}`);
  }
}

async function deleteR2Object(objectKey) {
  const deleteUrl = signR2Url({
    config: r2Config,
    expiresSeconds: 15 * 60,
    method: "DELETE",
    objectKey,
  });
  const response = await fetch(deleteUrl, { method: "DELETE" });

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => "");

    throw new Error(`R2 delete failed: ${response.status} ${body}`);
  }
}

function supabaseHeaders() {
  return {
    apikey: supabaseSecretKey,
    Authorization: `Bearer ${supabaseSecretKey}`,
  };
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
  const signedHeaders = "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${input.config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  const canonicalQueryString = Array.from(query.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeRfc3986(key)}=${encodeRfc3986(value)}`)
    .join("&");
  const canonicalHeaders = `host:${endpoint.host}\n`;
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
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(
    input.config.secretAccessKey,
    dateStamp,
    region,
    service,
  );
  const signature = hmacHex(signingKey, stringToSign);

  return `${input.config.endpoint}/${input.config.bucket}/${input.objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const dateKey = hmacBuffer(`AWS4${secretKey}`, dateStamp);
  const dateRegionKey = hmacBuffer(dateKey, regionName);
  const dateRegionServiceKey = hmacBuffer(dateRegionKey, serviceName);

  return hmacBuffer(dateRegionServiceKey, "aws4_request");
}

function hmacBuffer(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function hmacHex(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function toAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function readRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
