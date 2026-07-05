# TASK-002.8I Signal State Vocabulary

This task stops treating every wait state as generic loading. UI should consume a normalized display state from resolver helpers where raw upload, media asset, provider, or session data is involved.

## State Vocabulary

| State | Meaning | Progress bar allowed |
| --- | --- | --- |
| `waiting` | The room or surface is idle and needs media or user input. | No |
| `loading` | A short async operation is running, usually under a few seconds. | No |
| `uploading` | A measurable file transfer is active. | Yes, only real transfer percentage |
| `processing` | A long background job is running. | No, unless the backend exposes real measurable progress |
| `queued` | A provider accepted work but has not started visible processing. | No |
| `blocked` | User approval or another action is required. | Only if real saved progress exists |
| `recoverable` | A failed or paused operation can resume/retry. | Yes, only saved byte progress |
| `failed` | The operation stopped and needs recovery. | Only if real saved progress exists |
| `ready` | The operation completed. | No |

## Normalized Display State

Raw upload/session/media/provider data should be mapped to:

```ts
type SignalDisplayState = {
  state: SignalStateKind;
  label: string;
  detail: string;
  tone: SignalTone;
  progressPercent?: number;
  latestEvent?: string | null;
  primaryAction?: SignalDisplayAction | null;
  secondaryAction?: SignalDisplayAction | null;
};
```

Rules:

- Do not create fake percentages.
- Do not show progress bars for CloudConvert queued/converting/exporting unless the provider exposes real measurable progress.
- Do not reuse playback waveform animations as loading indicators.
- Failed and recoverable states must explain the next action.
- Blocking route/room transitions remain the responsibility of `RoomTransitionOverlay`.
- Persisted terminal media status is authoritative. For example, a completed CloudConvert asset may keep `processingStrategy = "convert"` for audit/history, but `status = "ready"` or `processingStatus = "ready"` must render as ready, not converting.

## Resolver Boundary

`lib/media/processing-display-state.ts` maps the current media pipeline to the normalized state object:

- R2 upload progress via `resolveUploadProgressDisplayState`.
- Recoverable multipart sessions via `resolveRecoverableUploadDisplayState`.
- CloudConvert queued/converting/exporting, approval-required, failed, direct-ready, and ready media via `resolveMediaAssetDisplayState`.

UI components should not scatter raw checks like `processingStatus === "queued"` unless they are deciding product behavior such as disabling playback. Status wording, tone, progress, and actions should come from the resolver.

## Component Boundaries

Shared primitives:

- `SignalStatusChip`: compact state label.
- `SignalInlineStatus`: short async state text.
- `SignalProgressBar`: real measurable progress only.
- `SignalSkeleton`: layout-preserving placeholder.

Room/media-specific components:

- `MediaProcessingStatus`: upload, multipart recovery, approval, CloudConvert, and retry state surfaces.
- `MetadataPlaceholderChips`: YouTube/source metadata placeholders.
- `IdleSignalState`: awaiting-media and empty room states.
- `RoomTransitionOverlay`: blocking navigation or room-transition overlay only.
