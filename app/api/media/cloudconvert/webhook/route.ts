import { NextResponse } from "next/server";

import {
  recordCloudConvertEvent,
  syncCloudConvertJob,
  verifyCloudConvertWebhookSignature,
} from "@/lib/media/cloudconvert";
import { createSupabaseAdminClient } from "@/lib/supabase";

type CloudConvertWebhookPayload = {
  event?: string;
  job?: {
    id?: string;
    status?: string;
    tag?: string;
    tasks?: unknown[];
  };
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature =
    request.headers.get("CloudConvert-Signature") ??
    request.headers.get("cloudconvert-signature");

  if (!verifyCloudConvertWebhookSignature({ body, signature })) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(body) as CloudConvertWebhookPayload;
  const assetId = payload.job?.tag;
  const jobId = payload.job?.id;

  if (!assetId || !jobId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createSupabaseAdminClient();
  const { data: asset, error } = await admin
    .from("media_assets")
    .select()
    .eq("id", assetId)
    .maybeSingle();

  if (error) {
    console.error("[cloudconvert:webhook:asset]", error);

    return NextResponse.json({ error: "Webhook asset lookup failed." }, { status: 500 });
  }

  if (!asset) {
    return NextResponse.json({ ok: true });
  }

  const job = payload.job;

  if (!job) {
    return NextResponse.json({ ok: true });
  }

  await recordCloudConvertEvent({
    assetId: asset.id,
    jobId,
    message: payload.event ?? "CloudConvert webhook received.",
    payload,
    status: payload.job?.status ?? payload.event ?? "webhook",
  });

  try {
    await syncCloudConvertJob({
      asset,
      job: {
        id: job.id,
        status: job.status,
        tasks: Array.isArray(job.tasks)
          ? (job.tasks as never)
          : undefined,
      },
    });
  } catch (syncError) {
    console.error("[cloudconvert:webhook:sync]", syncError);
  }

  return NextResponse.json({ ok: true });
}
