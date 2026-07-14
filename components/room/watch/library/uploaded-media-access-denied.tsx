import type { MediaLibraryAccess } from "../contracts";

export function UploadedMediaAccessDenied({
  access,
}: {
  access: MediaLibraryAccess;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <p className="technical-label text-primary-fixed-dim">Uploaded media</p>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Uploaded catalogue content is hidden for this account.
        </p>
      </div>
      <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-8 text-center">
        <p className="text-label-sm font-semibold text-on-surface">
          No permission to access uploaded content
        </p>
        <p className="mx-auto mt-2 max-w-xl text-label-sm text-on-surface-variant">
          {access.message}
        </p>
      </div>
    </section>
  );
}
