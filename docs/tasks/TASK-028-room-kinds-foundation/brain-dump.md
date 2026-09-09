# Owner intent and retained decisions

Status: planning record, 2026-09-08. This is a faithful summary, not a verbatim transcript.
Original owner capture remains untouched in [INBOX](../../product-intake/INBOX.md).
The later discussion supersedes its earlier owner-first "Global" proposal.

## Intended experiences

- **Personal:** the account's own persistent room; manual choices plus eventual
  recommendation-driven continuation. Default Listen, with Watch still available.
- **Shared:** invite others who can return later. Recommendations eventually
  blend participating, consenting accounts fairly. Shared does not mean public.
- **Themed:** a durable musical direction such as fantasy, classical or phonk.
  Manually adding an unrelated item must not change automatic suggestions' theme.
- **Temporary:** disposable experimentation without lasting implicit taste updates.
- **Legacy:** existing rooms remain usable under Saved Rooms in a small Legacy
  grouping until a separately planned transition. Preserve existing semantics.

Watch and Listen are presentation modes inside these experiences. Keep their
distinct accepted interfaces, common queue controls, volume behavior, mobile
player transitions, permissions and playback synchronization.

## Recommendation requirements carried forward

Normal use should teach the engine with little effort. Explicit likes and
intentional choices are stronger than passive playback; buffering, reconnection,
duplicate removal and another member's skip are not personal dislikes. Provide
optional three-dot corrections such as Do not suggest; no required training form.

Personal favors familiarity and rediscovery. Shared counts each account once,
separates membership from permission to use taste, and stays stable through brief
disconnects. Themed applies constraints before ranking and changes direction only
explicitly. Temporary permits explicit personal Likes but no durable implicit
training. Legacy retains established behavior until separately migrated.

Future Autoplay must keep manual choices first, a stable prepared next item,
bounded lookahead and one authoritative refill. Listen automatic suggestions
exclude catalogue assets; manual catalogue use still follows current access.
Do not add promotional creator quotas or equate obscurity with irrelevance.

The future Rooms Hub is distinct from in-room Home: Personal primary, other kinds
nearby, saved-room navigation, optional preferred startup destination, explicit
invitations taking precedence. That visual project follows useful room behavior.

## Details not silently decided

Temporary expiry, operational retention and cleanup; Shared grace period after
disconnect; consent withdrawal/history erasure details; theme schema and confidence
thresholds; account-deletion handling; future Legacy conversion; and whether guests
can create new Shared/Themed rooms. See [decision gates](review-notes.md).
