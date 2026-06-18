-- TASK-002.8E: CloudConvert credit efficiency.
-- Store upload inspection decisions so browser-safe MP4 files can become ready
-- without spending conversion credits, while expensive conversions wait for
-- explicit owner approval.

alter table public.media_assets
  drop constraint if exists media_assets_processing_status_check,
  add constraint media_assets_processing_status_check
    check (processing_status in (
      'not_required',
      'approval_required',
      'queued',
      'processing',
      'ready',
      'failed'
    ));

alter table public.media_assets
  add column if not exists inspection_result jsonb not null default '{}'::jsonb,
  add column if not exists processing_strategy text not null default 'convert'
    check (processing_strategy in ('direct_ready', 'convert', 'needs_approval', 'failed')),
  add column if not exists estimated_credits integer check (
    estimated_credits is null or estimated_credits >= 0
  ),
  add column if not exists owner_approval_required boolean not null default false,
  add column if not exists owner_approved_at timestamptz;

create index if not exists media_assets_processing_strategy_idx
  on public.media_assets (processing_strategy, created_at desc);

create index if not exists media_assets_approval_required_idx
  on public.media_assets (owner_user_id, created_at desc)
  where owner_approval_required is true
    and owner_approved_at is null;
