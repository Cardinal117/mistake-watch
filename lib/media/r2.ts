import "server-only";

import crypto from "node:crypto";

const defaultUploadMaxBytes = 10 * 1024 * 1024 * 1024;
export const multipartUploadThresholdBytes = 500 * 1024 * 1024;
export const multipartUploadPartSizeBytes = 64 * 1024 * 1024;
const uploadUrlTtlSeconds = 15 * 60;
const playbackUrlTtlSeconds = 30 * 60;
const supportedMimePrefixes = ["video/"];
const supportedVideoExtensions = new Set([
  ".avi",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp4",
  ".webm",
]);

export type R2Config = {
  accessKeyId: string;
  accountId: string;
  bucket: string;
  endpoint: string;
  secretAccessKey: string;
};

export type R2UploadValidation = { ok: true } | { message: string; ok: false };

export function getR2Config(): R2Config {
  const config = {
    accessKeyId: readRequiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    accountId: readRequiredEnv("CLOUDFLARE_ACCOUNT_ID"),
    bucket: readRequiredEnv("CLOUDFLARE_R2_BUCKET"),
    endpoint: readRequiredEnv("CLOUDFLARE_R2_ENDPOINT"),
    secretAccessKey: readRequiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
  };

  return {
    ...config,
    endpoint: config.endpoint.replace(/\/+$/, ""),
  };
}

export function getMediaUploadMaxBytes() {
  const configured = Number(process.env.MEDIA_UPLOAD_MAX_BYTES);

  if (Number.isFinite(configured) && configured > 0) {
    return Math.floor(configured);
  }

  return defaultUploadMaxBytes;
}

export function validateR2UploadInput(input: {
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}): R2UploadValidation {
  const name = input.fileName.trim();

  if (!name) {
    return { message: "Choose a video file first.", ok: false };
  }

  const extension = getFileExtension(name);
  const mimeType = input.mimeType.toLowerCase();
  const hasVideoMime = supportedMimePrefixes.some((prefix) =>
    mimeType.startsWith(prefix),
  );
  const hasVideoExtension = supportedVideoExtensions.has(extension);

  if (!hasVideoMime && !hasVideoExtension) {
    return {
      message: "Choose a supported video file.",
      ok: false,
    };
  }

  if (!Number.isSafeInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    return { message: "The selected file size is invalid.", ok: false };
  }

  if (input.fileSizeBytes > getMediaUploadMaxBytes()) {
    return {
      message: `The selected file is larger than ${formatBytes(getMediaUploadMaxBytes())}.`,
      ok: false,
    };
  }

  return { ok: true };
}

export function createR2ObjectKey(input: {
  fileName: string;
  ownerUserId: string;
}) {
  const extension = getFileExtension(input.fileName);
  const baseName =
    input.fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "media";
  const day = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();

  return `media/${input.ownerUserId}/${day}/${id}-${baseName}${extension}`;
}

export function createR2ProcessedObjectKey(input: {
  assetId: string;
  ownerUserId: string;
}) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-processed/${input.ownerUserId}/${day}/${input.assetId}.browser.mp4`;
}

export function createR2PosterObjectKey(input: {
  assetId: string;
  ownerUserId: string;
}) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-posters/${input.ownerUserId}/${day}/${input.assetId}.jpg`;
}

export function createR2CloudConvertPosterObjectKey(input: {
  assetId: string;
  ownerUserId: string;
}) {
  const day = new Date().toISOString().slice(0, 10);

  return `media-posters/${input.ownerUserId}/${day}/${input.assetId}-cloudconvert.jpg`;
}

export function createPrivateR2Reference(input: {
  bucket: string;
  objectKey: string;
}) {
  return `r2-private://${encodeURIComponent(input.bucket)}/${input.objectKey
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

export function createPresignedR2PutUrl(input: {
  contentType: string;
  objectKey: string;
  expiresSeconds?: number;
}) {
  const config = getR2Config();
  const expiresSeconds = input.expiresSeconds ?? uploadUrlTtlSeconds;

  return signR2Url({
    config,
    contentType: input.contentType,
    expiresSeconds,
    method: "PUT",
    objectKey: input.objectKey,
  });
}

export async function createR2MultipartUpload(input: {
  contentType: string;
  objectKey: string;
}) {
  const config = getR2Config();
  const url = signR2Url({
    config,
    contentType: input.contentType,
    expiresSeconds: 60,
    method: "POST",
    objectKey: input.objectKey,
    queryParams: [["uploads", ""]],
  });
  const response = await fetch(url, {
    headers: { "Content-Type": input.contentType },
    method: "POST",
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`R2 multipart upload could not start: ${response.status}`);
  }

  const uploadId = readXmlValue(body, "UploadId");

  if (!uploadId) {
    throw new Error(
      "R2 multipart upload response did not include an upload id.",
    );
  }

  return uploadId;
}

export function createPresignedR2UploadPartUrl(input: {
  expiresSeconds?: number;
  multipartUploadId: string;
  objectKey: string;
  partNumber: number;
}) {
  const config = getR2Config();

  return signR2Url({
    config,
    expiresSeconds: input.expiresSeconds ?? uploadUrlTtlSeconds,
    method: "PUT",
    objectKey: input.objectKey,
    queryParams: [
      ["partNumber", String(input.partNumber)],
      ["uploadId", input.multipartUploadId],
    ],
  });
}

export function createPresignedR2GetUrl(input: {
  expiresSeconds?: number;
  objectKey: string;
}) {
  const config = getR2Config();

  return signR2Url({
    config,
    expiresSeconds: input.expiresSeconds ?? playbackUrlTtlSeconds,
    method: "GET",
    objectKey: input.objectKey,
  });
}

export async function completeR2MultipartUpload(input: {
  multipartUploadId: string;
  objectKey: string;
  parts: Array<{
    etag: string;
    partNumber: number;
  }>;
}) {
  const config = getR2Config();
  const url = signR2Url({
    config,
    expiresSeconds: 60,
    method: "POST",
    objectKey: input.objectKey,
    queryParams: [["uploadId", input.multipartUploadId]],
  });
  const body = [
    "<CompleteMultipartUpload>",
    ...input.parts
      .slice()
      .sort((left, right) => left.partNumber - right.partNumber)
      .map(
        (part) =>
          `<Part><PartNumber>${part.partNumber}</PartNumber><ETag>${escapeXml(
            part.etag,
          )}</ETag></Part>`,
      ),
    "</CompleteMultipartUpload>",
  ].join("");
  const response = await fetch(url, {
    body,
    headers: { "Content-Type": "application/xml" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `R2 multipart upload could not complete: ${response.status}`,
    );
  }
}

export async function abortR2MultipartUpload(input: {
  multipartUploadId: string;
  objectKey: string;
}) {
  const config = getR2Config();
  const url = signR2Url({
    config,
    expiresSeconds: 60,
    method: "DELETE",
    objectKey: input.objectKey,
    queryParams: [["uploadId", input.multipartUploadId]],
  });
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `R2 multipart upload could not be aborted: ${response.status}`,
    );
  }
}

export async function listR2MultipartUploadParts(input: {
  multipartUploadId: string;
  objectKey: string;
}) {
  const config = getR2Config();
  const parts: Array<{
    etag: string;
    partNumber: number;
    size: number | null;
  }> = [];
  let partNumberMarker: string | null = null;

  for (let page = 0; page < 20; page += 1) {
    const queryParams: Array<[string, string]> = [
      ["uploadId", input.multipartUploadId],
      ["max-parts", "1000"],
    ];

    if (partNumberMarker) {
      queryParams.push(["part-number-marker", partNumberMarker]);
    }

    const url = signR2Url({
      config,
      expiresSeconds: 60,
      method: "GET",
      objectKey: input.objectKey,
      queryParams,
    });
    const response = await fetch(url, { method: "GET" });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(
        `R2 multipart parts could not be listed: ${response.status}`,
      );
    }

    parts.push(...readXmlParts(body));

    if (readXmlValue(body, "IsTruncated") !== "true") {
      break;
    }

    partNumberMarker = readXmlValue(body, "NextPartNumberMarker");

    if (!partNumberMarker) {
      break;
    }
  }

  return parts
    .filter((part) => part.partNumber > 0 && part.etag)
    .sort((left, right) => left.partNumber - right.partNumber);
}

export async function deleteR2Object(objectKey: string) {
  const config = getR2Config();
  const url = signR2Url({
    config,
    expiresSeconds: 60,
    method: "DELETE",
    objectKey,
  });
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 object could not be deleted: ${response.status}`);
  }
}

export async function assertR2ObjectExists(input: {
  contentLength?: number;
  objectKey: string;
}) {
  const config = getR2Config();
  const url = signR2Url({
    config,
    expiresSeconds: 60,
    method: "HEAD",
    objectKey: input.objectKey,
  });
  const response = await fetch(url, { method: "HEAD" });

  if (!response.ok) {
    throw new Error("Uploaded R2 object could not be verified.");
  }

  if (typeof input.contentLength === "number") {
    const length = Number(response.headers.get("content-length"));

    if (Number.isFinite(length) && length !== input.contentLength) {
      throw new Error(
        "Uploaded R2 object size does not match the upload session.",
      );
    }
  }
}

export function deriveMediaTitle(fileName: string) {
  return (
    fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160) || "Uploaded video"
  );
}

function signR2Url(input: {
  config: R2Config;
  contentType?: string;
  expiresSeconds: number;
  method: "DELETE" | "GET" | "HEAD" | "POST" | "PUT";
  objectKey: string;
  queryParams?: Array<[string, string]>;
}) {
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
  const shouldSignContentType = Boolean(input.contentType);
  const signedHeaders = shouldSignContentType ? "content-type;host" : "host";
  const query = new URLSearchParams(input.queryParams ?? []);

  query.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
  query.set(
    "X-Amz-Credential",
    `${input.config.accessKeyId}/${credentialScope}`,
  );
  query.set("X-Amz-Date", amzDate);
  query.set("X-Amz-Expires", String(input.expiresSeconds));
  query.set("X-Amz-SignedHeaders", signedHeaders);

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
  const canonicalHeaders = shouldSignContentType
    ? `content-type:${input.contentType}\nhost:${endpoint.host}\n`
    : `host:${endpoint.host}\n`;
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

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function hashHex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key: crypto.BinaryLike, value: string) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

function getSignatureKey(
  secretAccessKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const dateRegionKey = hmac(dateKey, regionName);
  const dateRegionServiceKey = hmac(dateRegionKey, serviceName);

  return hmac(dateRegionServiceKey, "aws4_request");
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function readXmlValue(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));

  return match?.[1] ?? null;
}

function readXmlParts(xml: string) {
  const parts: Array<{
    etag: string;
    partNumber: number;
    size: number | null;
  }> = [];
  const partPattern = /<Part>([\s\S]*?)<\/Part>/g;
  let match: RegExpExecArray | null;

  while ((match = partPattern.exec(xml))) {
    const block = match[1];
    const partNumber = Number(readXmlValue(block, "PartNumber"));
    const rawEtag = readXmlValue(block, "ETag") ?? "";
    const size = Number(readXmlValue(block, "Size"));

    if (Number.isInteger(partNumber) && partNumber > 0 && rawEtag) {
      parts.push({
        etag: unescapeXml(rawEtag),
        partNumber,
        size: Number.isFinite(size) ? size : null,
      });
    }
  }

  return parts;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(value: string) {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function formatBytes(bytes: number) {
  const gib = bytes / (1024 * 1024 * 1024);

  if (gib >= 1) {
    return `${gib.toFixed(1)} GB`;
  }

  return `${Math.ceil(bytes / (1024 * 1024))} MB`;
}

function getFileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.[a-z0-9]+$/);

  return match?.[0] ?? "";
}
