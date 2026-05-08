# Study Groups — Trim Stubs & Roadmap

> **For agentic workers:** Use subagent-driven or executing-plans workflows. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Keep only group features that are honestly implemented end-to-end; remove debug/no-op code; document gaps and the next high-value group capabilities.

**Architecture:** `StudyGroupHub` + `GroupsBento` drive UX; `StudyGroupManager` / React Query hooks call `/api/study-groups/*` and Supabase; group chat uses `create_group_chat_atomic` + `StudyGroupRealtimeChat`.

**Tech stack:** Next.js App Router, Clerk, Supabase (RLS + Realtime), React Query.

---

## Verified working (code path exists; manual QA on memospark still required)

| Feature | Evidence |
|---------|----------|
| Create group | `POST /api/study-groups` → row + member + RPC chat |
| Browse / discover | `GET /api/study-groups`, client discovery query |
| Join / leave | `StudyGroupManager.joinGroup` / `leaveGroup` + API |
| Group chat | `StudyGroupChatTab` + `useRealtimeChat` |
| Resources (note + link) | `addResource` with `file_path: undefined` |
| Study sessions | `StudySessionManager` hooks + tab UI |
| Members list | `useStudyGroupMembersDetailed` |
| Owner manage tab | `GroupManagementPanel` — invites, roles, audit hooks |
| Email invite | `POST /api/study-groups/[id]/invite` persists `invitee_name`, `message` |

---

## Removed or fixed in this pass

- [x] Strip all `http://127.0.0.1:7398` debug ingest calls (`useStudyGroupQueries`, `StudyGroupHub`, invite API).
- [x] Remove duplicate dead branch in invite route (`if (!targetUserId)` twice).
- [x] Wire invitation mutation body to send `invitee_name` + `message` (API already supported them).
- [x] Remove **File** resource type from create UI (no upload / `file_path` never set).
- [x] Remove no-op `useEffect` blocks (`StudyGroupHub`, `GroupManagementPanel`).

---

### Task 1: Group file attachments (optional next)

**Files:**

- Add: storage bucket policy migration + upload helper
- Modify: `StudyGroupHub` resource form, `addResource` payload

- [ ] **Step 1:** Add Supabase Storage bucket + RLS for `group_id`-scoped paths.
- [ ] **Step 2:** API route `POST /api/study-groups/[id]/resources/upload` (signed URL or server upload).
- [ ] **Step 3:** Reintroduce “File” type only when `file_path` is populated after upload.
- [ ] **Step 4:** Manual test: upload PDF, list, open link.

---

### Task 2: Shape / product — missing high-value group features

Prioritise after the trim (not in this doc’s scope to implement):

1. **Group pulse** — pinned post or “this week” strip (exam date, syllabus link) so chat isn’t the only source of truth.
2. **Shared academic context** — link group to courses on the student timetable (read-only overlap).
3. **Health metrics** — owner dashboard: inactive members, session attendance trend.
4. **Moderation** — remove member message, cooldown, or read-only mode (product + RLS).
5. **Discoverability** — subject/university tags beyond a single `category_id` filter.

---

### Task 3: Verification checklist (staging)

- [ ] Create public group → appears in browse → join from second account → both see chat history per policy.
- [ ] Add link resource → appears in list; note resource → same.
- [ ] Create session → second member join/leave.
- [ ] Owner: send invite with optional name + message → row in `study_group_invitations`.
- [ ] Confirm no network calls to `127.0.0.1:7398` in DevTools.

---

**Plan complete.** Prefer subagent-driven execution for Task 1; Tasks 2–3 are product + QA.
