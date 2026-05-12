import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type StudyGroupRow = Pick<
  Database["public"]["Tables"]["study_groups"]["Row"],
  "id" | "privacy_level" | "is_archived" | "metadata"
>;

/**
 * Resolved privacy level for push trust: public hubs do not imply a DM-style relationship.
 */
function resolvedStudyGroupPrivacyLevel(group: StudyGroupRow): string {
  const meta = group.metadata;
  const fromMeta =
    meta !== null &&
    typeof meta === "object" &&
    "privacy_level" in meta &&
    typeof (meta as { privacy_level?: unknown }).privacy_level === "string"
      ? (meta as { privacy_level: string }).privacy_level.trim()
      : null;
  return (group.privacy_level ?? fromMeta ?? "public").trim() || "public";
}

/** Private / invite flows only — excludes `public` (and unknown → treated as public). */
function allowsPushViaStudyGroupEdge(group: StudyGroupRow): boolean {
  if (group.is_archived === true) {
    return false;
  }
  const level = resolvedStudyGroupPrivacyLevel(group).toLowerCase();
  return level === "private" || level === "invite_only";
}

/**
 * MemoSpark social pushes may only reach a peer when:
 * - accepted connection either direction (and not blocked), or
 * - membership in the same **non-public** study group (`private` / `invite_only`, not archived).
 *
 * Explicit `blocked` rows always deny, even if the pair shares a large public group.
 */
export async function assertSocialPushAllowed(
  admin: SupabaseClient<Database>,
  senderUserId: string,
  recipientUserId: string,
): Promise<boolean> {
  if (senderUserId === recipientUserId) {
    return true;
  }

  const [blockFwd, blockRev] = await Promise.all([
    admin
      .from("connections")
      .select("id")
      .eq("status", "blocked")
      .eq("requester_id", senderUserId)
      .eq("receiver_id", recipientUserId)
      .maybeSingle(),
    admin
      .from("connections")
      .select("id")
      .eq("status", "blocked")
      .eq("requester_id", recipientUserId)
      .eq("receiver_id", senderUserId)
      .maybeSingle(),
  ]);

  if (blockFwd.error) {
    console.error("[social:push] connections:block_fwd]", blockFwd.error);
    return false;
  }
  if (blockRev.error) {
    console.error("[social:push] connections:block_rev]", blockRev.error);
    return false;
  }
  if (blockFwd.data != null || blockRev.data != null) {
    return false;
  }

  const [fwd, rev] = await Promise.all([
    admin
      .from("connections")
      .select("id")
      .eq("status", "accepted")
      .eq("requester_id", senderUserId)
      .eq("receiver_id", recipientUserId)
      .maybeSingle(),
    admin
      .from("connections")
      .select("id")
      .eq("status", "accepted")
      .eq("requester_id", recipientUserId)
      .eq("receiver_id", senderUserId)
      .maybeSingle(),
  ]);

  if (fwd.error) {
    console.error("[social:push] connections:fwd]", fwd.error);
    return false;
  }
  if (rev.error) {
    console.error("[social:push] connections:rev]", rev.error);
    return false;
  }
  if (fwd.data != null || rev.data != null) {
    return true;
  }

  const { data: senderGroups, error: senderGrpErr } = await admin
    .from("study_group_members")
    .select("group_id")
    .eq("user_id", senderUserId);

  if (senderGrpErr) {
    console.error("[social:push] study_groups:sender]", senderGrpErr);
    return false;
  }

  const groupIds = [
    ...new Set(
      (senderGroups ?? [])
        .map((row) => row.group_id)
        .filter((g): g is string => typeof g === "string" && g.length > 0),
    ),
  ];

  if (groupIds.length === 0) {
    return false;
  }

  const { data: groupsMeta, error: groupsErr } = await admin
    .from("study_groups")
    .select("id, privacy_level, is_archived, metadata")
    .in("id", groupIds);

  if (groupsErr) {
    console.error("[social:push] study_groups:meta]", groupsErr);
    return false;
  }

  const tightGroupIds = (groupsMeta ?? [])
    .filter(allowsPushViaStudyGroupEdge)
    .map((row) => row.id);

  if (tightGroupIds.length === 0) {
    return false;
  }

  const { data: sharedRow, error: sharedErr } = await admin
    .from("study_group_members")
    .select("id")
    .eq("user_id", recipientUserId)
    .in("group_id", tightGroupIds)
    .limit(1)
    .maybeSingle();

  if (sharedErr) {
    console.error("[social:push] study_groups:shared]", sharedErr);
    return false;
  }

  return sharedRow != null;
}
