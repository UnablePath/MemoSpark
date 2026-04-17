import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/layout/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | MemoSpark",
  description: "Terms of Service for MemoSpark.",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" subtitle="Terms of Service for MemoSpark.">
      <p className="mt-0 text-sm text-muted-foreground">Last updated: March 30, 2026</p>
      <div className="mt-6">
        <p>
          These Terms of Service govern your use of MemoSpark. By creating an
          account or using the service, you agree to these terms and to our{" "}
          <Link
            href="/privacy"
            className="text-primary underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <h2 className="mt-8 text-xl font-medium">Use of the service</h2>
        <p>
          You agree to use MemoSpark only for lawful purposes and in a way that
          does not infringe the rights of others or restrict their use of the
          service.
        </p>
        <h2 className="mt-8 text-xl font-medium">Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials and for activity under your account.
        </p>
        <h2 className="mt-8 text-xl font-medium">Changes</h2>
        <p>
          We may update these terms from time to time. Continued use after
          changes constitutes acceptance of the revised terms.
        </p>
        <h2 className="mt-8 text-xl font-medium">Contact</h2>
        <p>
          For questions about these terms, contact us through the channels
          listed on{" "}
          <Link
            href="/contact"
            className="text-primary underline underline-offset-4"
          >
            our contact page
          </Link>
          .
        </p>
      </div>
    </LegalPageShell>
  );
}
