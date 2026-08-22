---
id: MW-BUG-015
type: bug
status: confirmed
priority: P1
area: uploaded-media-security
related: [TASK-009, MW-BUG-004]
created: 2026-08-22
updated: 2026-08-22
---

# Uploaded playback response can expose a cacheable bearer URL

> [!bug] Confirmed - P1

- **Expected:** The authorized uploaded-playback resolver returns sensitive
  delivery data with explicit private, non-storable cache controls. Temporary
  delivery remains room-session authorized, and permanent R2 URLs or object keys
  do not enter durable queue or live room state.
- **Observed:** Read-only production QA on 2026-08-22 confirmed that the resolver
  returns a presigned R2 playback URL with a 1,800-second lifetime. The response
  was reported as `Cache-Control: public, max-age=0, must-revalidate`, and the
  signed URL remained usable in a separate browser tab during its validity
  window. The route source has no explicit private cache header.
- **Boundary:** This is not evidence of an authorization bypass or a permanent
  URL regression. The resolver rejected a missing room id with `400` and an
  unrelated room id with `403`; queue and live room state retained an opaque
  uploaded-session reference rather than a permanent R2 URL. Existing product
  notes explicitly accept that temporary signed URLs are transferable while
  active for the friends-and-family MVP.
- **Risk:** A shared cache is allowed to retain a response containing a reusable
  private-media bearer URL. A copied URL can also be used independently of later
  room-state checks until it expires. Meaningful owner, filename, or object
  metadata in the signed path would add a separate privacy concern and has not
  yet been classified.
- **Required correction:** Return playback resolver success and error responses
  with `Cache-Control: private, no-store` and appropriate cookie variance. Add a
  behavior test that prevents public caching of signed playback responses.
- **Required validation:** Cover authorized participants, missing and unrelated
  rooms, revoked participants, expired room sessions, missing objects, signed
  URL expiry, and renewal. Confirm that no playback URL enters SpacetimeDB,
  Supabase queue data, browser persistence, Media Session metadata, logs, or
  diagnostics.
- **Design decision:** Do not shorten the current signature lifetime until
  [[MW-BUG-004-uploaded-session-renewal-freeze|MW-BUG-004]] renewal is reliable.
  If non-transferable playback becomes a product requirement, use a range-capable
  authenticated proxy or a revocable CDN/session token; a shorter presigned URL
  alone does not provide non-transferability.
- **Privacy follow-up:** Inspect generated object-key structure without recording
  real keys. If paths encode owner ids or source filenames, adopt opaque object
  identifiers for future uploads and plan safe migration separately.
- **Evidence handling:** No invite token, cookie, account detail, full signed URL,
  uploaded-media URL, room secret, or object key is retained in this report.
- **Related work:** TASK-009 private object delivery, MW-BUG-004 playback renewal.
- **Next action:** Create a compact security task covering the response-header
  correction and focused tests, while keeping proxy/CDN redesign out of scope
  unless the owner changes the current transferability requirement.
