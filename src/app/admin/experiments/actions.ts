"use server";

import { userCanViewExperimentAnalytics } from "@/lib/analytics/experimentAdminAccess";
import {
  type ExperimentSummaryFailure,
  type ExperimentSummaryResult,
  queryExperimentSummary,
} from "@/lib/analytics/experimentSummaryQuery";
import { auth, currentUser } from "@clerk/nextjs/server";

export type ExperimentSummaryActionResult =
  | ExperimentSummaryResult
  | ExperimentSummaryFailure;

export async function refreshExperimentSummaryAction(input: {
  experimentKey: string;
  conversionType: string;
  days: number;
}): Promise<ExperimentSummaryActionResult> {
  const { userId } = await auth();
  const user = await currentUser();
  const emails = user?.emailAddresses?.map((entry) => entry.emailAddress) ?? [];
  if (!userCanViewExperimentAnalytics(userId, emails)) {
    return { success: false, error: "Forbidden", status: 403 };
  }
  return queryExperimentSummary({
    experimentKey: input.experimentKey,
    conversionType: input.conversionType,
    days: input.days,
  });
}
