import type { StudyGroup } from '@/lib/social/StudyGroupManager';

/**
 * Relative "last activity" label for group cards (matches dashboard bento tone).
 */
export function formatStudyGroupActivityLabel(
  group: Pick<StudyGroup, 'updated_at' | 'created_at'>,
): string {
  const iso = group.updated_at || group.created_at;
  if (!iso) return 'Recently';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Recently';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
