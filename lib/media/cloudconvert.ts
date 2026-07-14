import "server-only";

import crypto from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/supabase";
import type { Tables } from "@/lib/supabase";
import type { Json } from "@/lib/supabase/database.types";

import { buildCloudConvertMediaJobPayload } from "./cloudconvert-payload";
import {
  createR2CloudConvertPosterObjectKey,
  createR2ProcessedObjectKey,
  createPrivateR2Reference,
  getR2Config,
} from "./r2";

const cloudConvertApiBase = "https://api.cloudconvert.com/v2";

export type CloudConvertDiagnostics = {
  account: {
    email: string | null;
    id: string | null;
    name: string | null;
    username: string | null;
  } | null;
  configured: boolean;
  error: string | null;
  recentFailures: Array<{
    assetId: string;
    jobId: string | null;
    message: string | null;
    title: string;
    updatedAt: string;
  }>;
  token: {
    masked: string | null;
    present: boolean;
  };
  efficiency: {
    approvalRequired: number;
    converted: number;
    directReady: number;
    estimatedCreditsAvoided: number;
  };
  usage: {
    credits: number | null;
    minutes: number | null;
    tasks: number | null;
  };
  webhookConfigured: boolean;
};

type CloudConvertJobResponse = {
  data?: CloudConvertJob;
};

type CloudConvertJob = {
  id?: string;
  status?: string;
  tasks?: CloudConvertTask[];
};

type CloudConvertTask = {
  code?: string | null;
  message?: string | null;
  name?: string;
  operation?: string;
  result?: {
    files?: Array<{
      filename?: string;
      url?: string;
    }>;
  };
  status?: string;
};

export class CloudConvertError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "CloudConvertError";
    this.status = status;
  }
}

export function isCloudConvertConfigured() {
  return Boolean(process.env.CLOUDCONVERT_API_TOKEN);
}

export async function createCloudConvertMediaJob(input: {
  asset: Tables<"media_assets">;
  sourceObjectKey: string;
}) {
  const token = readCloudConvertToken();
  const r2 = getR2Config();
  const processedObjectKey = createR2ProcessedObjectKey({
    assetId: input.asset.id,
    ownerUserId: input.asset.owner_user_id,
  });
  const posterObjectKey = createR2CloudConvertPosterObjectKey({
    assetId: input.asset.id,
    ownerUserId: input.asset.owner_user_id,
  });
  const webhookUrl = process.env.CLOUDCONVERT_WEBHOOK_URL?.trim();
  const response = await fetch(`${cloudConvertApiBase}/jobs`, {
    body: JSON.stringify(
      buildCloudConvertMediaJobPayload({
        assetId: input.asset.id,
        exportCredentials: {
          accessKeyId: r2.accessKeyId,
          bucket: r2.bucket,
          endpoint: r2.endpoint,
          secretAccessKey: r2.secretAccessKey,
        },
        posterObjectKey,
        processedObjectKey,
        sourceObjectKey: input.sourceObjectKey,
        webhookUrl,
      }),
    ),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const body = (await response
    .json()
    .catch(() => ({}))) as CloudConvertJobResponse & {
    message?: string;
  };

  if (!response.ok || !body.data?.id) {
    throw new CloudConvertError(
      readCloudConvertError(body) ??
        `CloudConvert job could not be created (${response.status}).`,
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }

  await recordCloudConvertEvent({
    assetId: input.asset.id,
    jobId: body.data.id,
    message: "CloudConvert job queued.",
    payload: body.data,
    status: body.data.status ?? "queued",
  });

  return {
    job: body.data,
    posterObjectKey,
    processedObjectKey,
  };
}

export async function getCloudConvertJob(jobId: string) {
  const token = readCloudConvertToken();
  const response = await fetch(
    `${cloudConvertApiBase}/jobs/${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = (await response
    .json()
    .catch(() => ({}))) as CloudConvertJobResponse & {
    message?: string;
  };

  if (!response.ok || !body.data) {
    throw new CloudConvertError(
      readCloudConvertError(body) ??
        `CloudConvert job could not be loaded (${response.status}).`,
      response.status >= 400 && response.status < 500 ? 400 : 502,
    );
  }

  return body.data;
}

export async function syncCloudConvertJob(input: {
  asset: Tables<"media_assets">;
  job?: CloudConvertJob;
}) {
  const job =
    input.job ??
    (input.asset.processing_job_id
      ? await getCloudConvertJob(input.asset.processing_job_id)
      : null);

  if (!job) {
    return input.asset;
  }

  if (
    job.id &&
    input.asset.processing_job_id &&
    job.id !== input.asset.processing_job_id
  ) {
    await recordCloudConvertEvent({
      assetId: input.asset.id,
      jobId: job.id,
      message: "Ignored stale CloudConvert job update for this media asset.",
      payload: {
        activeJobId: input.asset.processing_job_id,
        receivedJobId: job.id,
        receivedStatus: job.status,
      },
      status: "ignored_stale_job",
    });

    return input.asset;
  }

  await recordCloudConvertTasks(input.asset.id, job);

  if (job.status === "finished") {
    return markCloudConvertAssetReady(input.asset, job);
  }

  if (job.status === "error" || job.status === "failed") {
    return markCloudConvertAssetFailed(
      input.asset,
      getJobFailureMessage(job),
      job,
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .update({
      processing_status: "processing",
      status: "processing",
    })
    .eq("id", input.asset.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function markCloudConvertAssetReady(
  asset: Tables<"media_assets">,
  job?: CloudConvertJob,
) {
  const r2 = getR2Config();
  const processedObjectKey =
    asset.processed_object_key ??
    createR2ProcessedObjectKey({
      assetId: asset.id,
      ownerUserId: asset.owner_user_id,
    });
  const posterObjectKey =
    asset.thumbnail_object_key ??
    createR2CloudConvertPosterObjectKey({
      assetId: asset.id,
      ownerUserId: asset.owner_user_id,
    });
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .update({
      mime_type: "video/mp4",
      poster_status: "ready",
      processing_completed_at: new Date().toISOString(),
      processing_error_message: null,
      processing_status: "ready",
      public_url: createPrivateR2Reference({
        bucket: r2.bucket,
        objectKey: processedObjectKey,
      }),
      r2_object_key: processedObjectKey,
      status: "ready",
      thumbnail_object_key: posterObjectKey,
      thumbnail_url: createPrivateR2Reference({
        bucket: r2.bucket,
        objectKey: posterObjectKey,
      }),
      waveform_status: "missing",
    })
    .eq("id", asset.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await admin
    .from("media_upload_sessions")
    .update({
      error_message: null,
      status: "ready",
    })
    .eq("media_asset_id", asset.id);

  await recordCloudConvertEvent({
    assetId: asset.id,
    jobId: job?.id ?? asset.processing_job_id,
    message: "CloudConvert processing finished.",
    payload: job,
    status: "ready",
  });

  return data;
}

export async function markCloudConvertAssetFailed(
  asset: Tables<"media_assets">,
  message: string,
  job?: CloudConvertJob,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("media_assets")
    .update({
      poster_status: "failed",
      processing_completed_at: new Date().toISOString(),
      processing_error_message: message.slice(0, 1000),
      processing_status: "failed",
      status: "failed",
    })
    .eq("id", asset.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  await admin
    .from("media_upload_sessions")
    .update({
      error_message: message.slice(0, 1000),
      status: "failed",
    })
    .eq("media_asset_id", asset.id);

  await recordCloudConvertEvent({
    assetId: asset.id,
    jobId: job?.id ?? asset.processing_job_id,
    message,
    payload: job,
    status: "failed",
  });

  return data;
}

export async function getCloudConvertDiagnostics(): Promise<CloudConvertDiagnostics> {
  const token = process.env.CLOUDCONVERT_API_TOKEN?.trim() ?? "";
  const configured = Boolean(token);
  const admin = createSupabaseAdminClient();
  const { data: recentFailures } = await admin
    .from("media_assets")
    .select("id,title,processing_job_id,processing_error_message,updated_at")
    .eq("processing_provider", "cloudconvert")
    .eq("processing_status", "failed")
    .order("updated_at", { ascending: false })
    .limit(5);
  const { data: efficiencyRows } = await admin
    .from("media_assets")
    .select("estimated_credits,processing_strategy")
    .in("processing_strategy", ["direct_ready", "convert", "needs_approval"])
    .limit(1000);
  const efficiency = summarizeProcessingEfficiency(efficiencyRows ?? []);

  if (!configured) {
    return {
      account: null,
      configured: false,
      error: "CLOUDCONVERT_API_TOKEN is not configured.",
      recentFailures: (recentFailures ?? []).map(toRecentFailure),
      efficiency,
      token: { masked: null, present: false },
      usage: { credits: null, minutes: null, tasks: null },
      webhookConfigured: Boolean(process.env.CLOUDCONVERT_WEBHOOK_SECRET),
    };
  }

  try {
    const response = await fetch(`${cloudConvertApiBase}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      data?: Record<string, unknown>;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(
        readCloudConvertError(payload) ??
          `CloudConvert returned ${response.status}.`,
      );
    }

    const data = payload.data ?? {};

    return {
      account: {
        email: readString(data, "email"),
        id: readString(data, "id"),
        name: readString(data, "name"),
        username: readString(data, "username"),
      },
      configured: true,
      error: null,
      recentFailures: (recentFailures ?? []).map(toRecentFailure),
      efficiency,
      token: { masked: maskToken(token), present: true },
      usage: {
        credits: readNumber(data, "credits"),
        minutes: readNumber(data, "minutes"),
        tasks: readNumber(data, "tasks"),
      },
      webhookConfigured: Boolean(process.env.CLOUDCONVERT_WEBHOOK_SECRET),
    };
  } catch (error) {
    return {
      account: null,
      configured: true,
      error:
        error instanceof Error
          ? error.message
          : "CloudConvert diagnostics could not load.",
      recentFailures: (recentFailures ?? []).map(toRecentFailure),
      efficiency,
      token: { masked: maskToken(token), present: true },
      usage: { credits: null, minutes: null, tasks: null },
      webhookConfigured: Boolean(process.env.CLOUDCONVERT_WEBHOOK_SECRET),
    };
  }
}

export function verifyCloudConvertWebhookSignature(input: {
  body: string;
  signature: string | null;
}) {
  const secret = process.env.CLOUDCONVERT_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return true;
  }

  if (!input.signature) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", secret)
    .update(input.body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(digest),
    Buffer.from(input.signature),
  );
}

export async function recordCloudConvertEvent(input: {
  assetId: string;
  jobId?: string | null;
  message?: string | null;
  payload?: unknown;
  status: string;
  taskName?: string | null;
  taskOperation?: string | null;
}) {
  const admin = createSupabaseAdminClient();

  await admin.from("media_processing_events").insert({
    job_id: input.jobId ?? null,
    media_asset_id: input.assetId,
    message: input.message ?? null,
    payload: normalizeJsonPayload(input.payload),
    provider: "cloudconvert",
    status: input.status,
    task_name: input.taskName ?? null,
    task_operation: input.taskOperation ?? null,
  });
}

async function recordCloudConvertTasks(assetId: string, job: CloudConvertJob) {
  for (const task of job.tasks ?? []) {
    await recordCloudConvertEvent({
      assetId,
      jobId: job.id,
      message: task.message ?? null,
      payload: task,
      status: task.status ?? job.status ?? "unknown",
      taskName: task.name ?? null,
      taskOperation: task.operation ?? null,
    });
  }
}

function getJobFailureMessage(job: CloudConvertJob) {
  const failedTask = job.tasks?.find(
    (task) => task.status === "error" || task.status === "failed",
  );
  const message = failedTask?.message ?? failedTask?.code ?? null;

  if (message === "The audio bitrate must be an integer.") {
    return "CloudConvert rejected the audio bitrate setting. Retry with the corrected conversion profile.";
  }

  return message ?? "CloudConvert could not process this video.";
}

function readCloudConvertToken() {
  const token = process.env.CLOUDCONVERT_API_TOKEN?.trim();

  if (!token) {
    throw new CloudConvertError("CloudConvert is not configured.", 503);
  }

  return token;
}

function readCloudConvertError(body: { message?: unknown }) {
  return typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : null;
}

function readString(value: Record<string, unknown>, key: string) {
  const candidate = value[key];

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

function readNumber(value: Record<string, unknown>, key: string) {
  const candidate = value[key];

  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : null;
}

function maskToken(token: string) {
  if (token.length <= 10) {
    return "configured";
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function normalizeJsonPayload(payload: unknown): Json | null {
  if (!payload) {
    return null;
  }

  return JSON.parse(JSON.stringify(payload)) as Json;
}

function toRecentFailure(row: {
  id: string;
  processing_error_message: string | null;
  processing_job_id: string | null;
  title: string;
  updated_at: string;
}) {
  return {
    assetId: row.id,
    jobId: row.processing_job_id,
    message: row.processing_error_message,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function summarizeProcessingEfficiency(
  rows: Array<{
    estimated_credits: number | null;
    processing_strategy: string;
  }>,
) {
  return rows.reduce(
    (summary, row) => {
      if (row.processing_strategy === "direct_ready") {
        summary.directReady += 1;
        summary.estimatedCreditsAvoided += row.estimated_credits ?? 0;
      }

      if (row.processing_strategy === "convert") {
        summary.converted += 1;
      }

      if (row.processing_strategy === "needs_approval") {
        summary.approvalRequired += 1;
      }

      return summary;
    },
    {
      approvalRequired: 0,
      converted: 0,
      directReady: 0,
      estimatedCreditsAvoided: 0,
    },
  );
}
