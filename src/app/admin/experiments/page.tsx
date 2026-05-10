import { ExperimentAnalyticsPanel } from "@/components/admin/ExperimentAnalyticsPanel";
import { userCanViewExperimentAnalytics } from "@/lib/analytics/experimentAdminAccess";
import { HOMEPAGE_CTA_EXPERIMENT_KEY } from "@/lib/analytics/experimentRuntime";
import { queryExperimentSummary } from "@/lib/analytics/experimentSummaryQuery";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "A/B experiments | MemoSpark",
};

export default async function AdminExperimentsPage() {
  const { userId } = await auth();
  const user = await currentUser();
  const emails = user?.emailAddresses?.map((entry) => entry.emailAddress) ?? [];
  if (!userCanViewExperimentAnalytics(userId, emails)) {
    redirect("/");
  }

  const initial = await queryExperimentSummary({
    experimentKey: HOMEPAGE_CTA_EXPERIMENT_KEY,
    conversionType: "sign_up_started",
    days: 30,
  });

  if (!initial.success) {
    return (
      <div className="container mx-auto max-w-4xl py-10 px-4">
        <p className="text-muted-foreground">
          Could not load experiment analytics. Ensure Supabase is configured and
          the experiment migration has been applied.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8 px-4">
      <ExperimentAnalyticsPanel
        initial={initial}
        experimentKey={HOMEPAGE_CTA_EXPERIMENT_KEY}
      />
    </div>
  );
}
