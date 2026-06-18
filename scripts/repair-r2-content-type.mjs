import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");

loadDotEnv(envPath);

const objectKey = process.argv[2];
const contentType = process.argv[3] ?? "video/mp4";

if (!objectKey) {
  console.error("Usage: node scripts/repair-r2-content-type.mjs <object-key> [content-type]");
  process.exit(1);
}

const config = {
  accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
  endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT").replace(/\/+$/, ""),
  secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
};

const url = signR2Url({
  config,
  expiresSeconds: 60,
  extraHeaders: {
    "content-type": contentType,
    "x-amz-copy-source": createCopySource(config.bucket, objectKey),
    "x-amz-metadata-directive": "REPLACE",
  },
  method: "PUT",
  objectKey,
});
const response = await fetch(url, {
  headers: {
    "Content-Type": contentType,
    "x-amz-copy-source": createCopySource(config.bucket, objectKey),
    "x-amz-metadata-directive": "REPLACE",
  },
  method: "PUT",
});

if (!response.ok) {
  const body = await response.text().catch(() => "");

  throw new Error(
    `R2 metadata repair failed: ${response.status} ${response.statusText} ${body}`,
  );
}

console.log(`Updated ${objectKey} to ${contentType}.`);

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
  const normalizedHeaders = normalizeHeaders({
    host: endpoint.host,
    ...input.extraHeaders,
  });
  const signedHeaders = Object.keys(normalizedHeaders).sort().join(";");
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
  const canonicalHeaders = Object.entries(normalizedHeaders)
    .sort(([left], [right]) => {
      if (left < right) {
        return -1;
      }

      if (left > right) {
        return 1;
      }

      return 0;
    })
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
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

function normalizeHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key.toLowerCase(),
      String(value).trim().replace(/\s+/g, " "),
    ]),
  );
}

function createCopySource(bucket, key) {
  return `/${bucket}/${key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
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
