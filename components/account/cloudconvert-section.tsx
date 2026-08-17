"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";

type CloudConvertDiagnostics = {
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
  token: { masked: string | null; present: boolean };
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

export function CloudConvertSection() {
  const [diagnostics, setDiagnostics] =
    useState<CloudConvertDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchDiagnostics() {
    const response = await fetch("/api/media/cloudconvert/status", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      diagnostics?: CloudConvertDiagnostics;
      error?: string;
    };

    if (!response.ok || !payload.diagnostics) {
      throw new Error(payload.error ?? "CloudConvert status could not load.");
    }

    return payload.diagnostics;
  }

  async function loadDiagnostics() {
    setLoading(true);
    setError(null);

    try {
      setDiagnostics(await fetchDiagnostics());
    } catch (loadError) {
      setError(readDiagnosticsError(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDiagnostics() {
      try {
        const nextDiagnostics = await fetchDiagnostics();

        if (!cancelled) setDiagnostics(nextDiagnostics);
      } catch (loadError) {
        if (!cancelled) setError(readDiagnosticsError(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialDiagnostics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="grid gap-4 rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="technical-label text-primary-fixed-dim">CloudConvert</p>
          <h4 className="mt-2 text-headline-md font-semibold text-on-surface">
            Video processing
          </h4>
          <p className="mt-2 max-w-2xl text-label-sm text-on-surface-variant">
            Owner uploads are converted into browser-safe MP4 files before they
            become playable.
          </p>
        </div>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/10 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
          onClick={() => void loadDiagnostics()}
          type="button"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-sm border border-error/30 bg-error/10 p-3 text-label-sm text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-3">
        <DiagnosticsFacts
          rows={[
            [
              "Status",
              loading
                ? "Checking"
                : diagnostics?.configured
                  ? "Configured"
                  : "Missing token",
            ],
            ["Token", diagnostics?.token.masked ?? "Not configured"],
            [
              "Webhook",
              diagnostics?.webhookConfigured ? "Configured" : "Not configured",
            ],
          ]}
        />
        <DiagnosticsFacts
          rows={[
            [
              "Account",
              diagnostics?.account?.email ??
                diagnostics?.account?.name ??
                "Unavailable",
            ],
            ["Username", diagnostics?.account?.username ?? "Unavailable"],
            ["Account ID", diagnostics?.account?.id ?? "Unavailable"],
          ]}
        />
        <DiagnosticsFacts
          rows={[
            ["Credits", formatNumber(diagnostics?.usage.credits)],
            ["Minutes", formatNumber(diagnostics?.usage.minutes)],
            ["Tasks", formatNumber(diagnostics?.usage.tasks)],
          ]}
        />
      </div>

      <div className="grid gap-2 lg:grid-cols-4">
        <DiagnosticsFacts
          rows={[
            ["Direct ready", formatNumber(diagnostics?.efficiency.directReady)],
          ]}
        />
        <DiagnosticsFacts
          rows={[
            ["Converted", formatNumber(diagnostics?.efficiency.converted)],
          ]}
        />
        <DiagnosticsFacts
          rows={[
            [
              "Needs approval",
              formatNumber(diagnostics?.efficiency.approvalRequired),
            ],
          ]}
        />
        <DiagnosticsFacts
          rows={[
            [
              "Credits avoided",
              formatNumber(diagnostics?.efficiency.estimatedCreditsAvoided),
            ],
          ]}
        />
      </div>

      {diagnostics?.error ? (
        <div className="flex items-start gap-2 rounded-sm border border-secondary-fixed-dim/30 bg-secondary-fixed-dim/10 p-3 text-label-sm text-secondary-fixed-dim">
          <Activity className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {diagnostics.error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <p className="technical-label text-on-surface-variant">
          Recent processing failures
        </p>
        {diagnostics?.recentFailures.length ? (
          diagnostics.recentFailures.map((failure) => (
            <div
              className="grid gap-1 rounded-sm border border-white/10 bg-white/[0.025] p-3 text-label-sm"
              key={failure.assetId}
            >
              <span className="font-semibold text-on-surface">
                {failure.title}
              </span>
              <span className="text-on-surface-variant">
                {failure.message ?? "No provider message."}
              </span>
              <span className="technical-label text-primary-fixed-dim">
                {failure.jobId ?? "No job id"}
              </span>
            </div>
          ))
        ) : (
          <p className="rounded-sm border border-white/10 bg-white/[0.025] p-3 text-label-sm text-on-surface-variant">
            No recent CloudConvert failures.
          </p>
        )}
      </div>
    </section>
  );
}

function DiagnosticsFacts({ rows }: { rows: string[][] }) {
  return (
    <dl className="grid gap-2 rounded-md border border-white/10 bg-surface-container-lowest/42 p-4">
      {rows.map(([label, value]) => (
        <div
          className="grid gap-1 rounded-sm border border-white/5 bg-white/[0.025] p-3"
          key={label}
        >
          <dt className="technical-label text-on-surface-variant">{label}</dt>
          <dd className="text-body-md font-semibold text-on-surface">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function readDiagnosticsError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "CloudConvert status could not load.";
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" ? value.toLocaleString() : "Unavailable";
}
