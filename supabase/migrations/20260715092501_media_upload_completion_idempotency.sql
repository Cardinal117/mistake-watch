-- TASK-002.8H corrective hardening:
-- One uploaded R2 source object must map to one media asset for an owner.
-- This prevents repeated upload-completion calls from creating duplicate
-- CloudConvert jobs and spending credits for the same source file.

create unique index if not exists media_assets_owner_source_object_unique_idx
  on public.media_assets (owner_user_id, source_object_key)
  where source_object_key is not null;
