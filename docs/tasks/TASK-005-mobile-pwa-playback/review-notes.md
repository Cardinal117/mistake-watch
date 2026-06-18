# TASK-005 Mobile PWA Playback Review Notes

## Decisions

- PWA is approved as a mobile usability and installability layer.
- Background playback should be framed as source/browser-dependent.
- First-party direct/R2 media is the preferred path for reliable background audio.
- YouTube background playback must not be promised.

## Assumptions

- The current web architecture remains the primary product.
- No native wrapper is introduced in this task.
- Existing room permissions stay authoritative.
- The current manifest is a starting point, not final proof of installability.

## Questions To Confirm

- Which phones/browsers will be used for QA first?
- Should installed app start at `/` or a dedicated mobile dashboard path later?
- Should unsupported background playback show a passive hint or only appear in help/settings?

## Future Considerations

- Capacitor/native wrapper if PWA limits become unacceptable.
- Push notifications for room invites.
- Offline saved rooms shell.
- Durable user media preferences after account personalization expands.

