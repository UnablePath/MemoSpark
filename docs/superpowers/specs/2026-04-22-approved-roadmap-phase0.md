# MemoSpark roadmap — Phase 0 completed (2026-04-22)

**Approval:** User approved the value roadmap; this document records what was implemented in **Phase 0 (de-clutter and align surface)**.

## Changes

- **Removed dead code:** `StudentConnectionTab`, `ActivityFeedPlaceholder`, `StudyGroupHubPlaceholder`, `GamifiedReminderTab` (nothing imported them; dashboard uses `ConnectionInterface`).
- **Canonical study groups on `/groups`:** Page now renders `StudyGroupHub` from `src/components/social/StudyGroupHub.tsx` (same as Groups lane in Connections). Removed legacy `StudyGroupInterface` in `components/groups` and the unused `components/social/StudyGroupInterface.tsx`.
- **Middleware:** `pwa-test`, `pwa-debug`, `onesignal-test`, `api/test-notification`, `api/test-manifest`, and `api/debug-clerk` are **public only in `NODE_ENV === 'development'`**; production no longer allows anonymous access to these paths.
- **Copy/comments:** `DashboardSwipeTabs` and `ConnectionsDebug` no longer refer to the removed `StudentConnectionTab` name. `CODEBASE_STRUCTURE.md` updated to match.

## Next (not done in this PR)

- Phase 1: real activity feed (`activity_events` + API + `ActivityFeed` UI), group/session polish, notifications for social.
- Phase 2: core forgetfulness loop (reminders, preferences vs OneSignal, honest AI surfaces).
- Phase 3: shop requirement enforcement, optional pattern feedback.

See the approved plan in `.cursor/plans/` (MemoSpark value roadmap) for the full picture.
