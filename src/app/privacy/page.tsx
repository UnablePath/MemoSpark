import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | MemoSpark",
  description:
    "How MemoSpark collects, uses, and protects information — including account and onboarding data.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-foreground">
      <p className="text-sm text-muted-foreground">
        <Link
          href="/"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Home
        </Link>
        {" · "}
        <Link
          href="/terms"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Terms of Service
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: March 30, 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
        <p>
          This policy describes how MemoSpark handles information when you use
          our website and services. It should be reviewed alongside our{" "}
          <Link
            href="/terms"
            className="text-primary underline underline-offset-4"
          >
            Terms of Service
          </Link>
          .
        </p>

        <h2 className="mt-8 text-xl font-medium">Information we collect</h2>
        <p>
          We collect information you provide — for example, account details from
          our authentication provider, and profile or onboarding information you
          choose to submit (such as name, academic interests, optional date of
          birth for age-appropriate experience, and learning preferences).
        </p>
        <p>
          We also collect limited technical data needed to operate the service
          (such as analytics events related to onboarding steps, device or
          browser metadata, and security logs).
        </p>

        <h2 className="mt-8 text-xl font-medium">How we use information</h2>
        <p>
          We use this information to provide and improve MemoSpark, personalize
          your experience, maintain security, and comply with legal obligations.
        </p>

        <h2 className="mt-8 text-xl font-medium">Sensitive data</h2>
        <p>
          Where we ask for date of birth or similar fields, it is used for
          eligibility, age-appropriate defaults, and product safety — not for
          advertising. Do not use MemoSpark if you are under the age required in
          your region to consent to data processing, unless a parent or guardian
          has authorized use where applicable.
        </p>

        <h2 className="mt-8 text-xl font-medium">Sharing</h2>
        <p>
          We share data with service providers that help us run the product (for
          example, authentication and database hosting) under appropriate
          agreements. We do not sell your personal information.
        </p>

        <h2 className="mt-8 text-xl font-medium">Your choices</h2>
        <p>
          You may access or update certain profile information in the app. You
          may contact us to exercise applicable privacy rights under local law.
        </p>

        <h2 className="mt-8 text-xl font-medium">Contact</h2>
        <p>
          Questions about this policy can be sent via{" "}
          <Link
            href="/contact"
            className="text-primary underline underline-offset-4"
          >
            our contact page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
