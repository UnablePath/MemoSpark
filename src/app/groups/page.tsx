import { StudyGroupHub } from "@/components/social/StudyGroupHub";

/**
 * Full-page study groups: same experience as the Groups lane on the dashboard
 * Connections hub (single source of truth).
 */
export default function GroupsPage() {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <StudyGroupHub />
      </div>
    </main>
  );
}
