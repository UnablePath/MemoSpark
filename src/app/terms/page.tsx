import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | MemoSpark",
  description: "Terms of Service for MemoSpark.",
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
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
          href="/privacy"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Privacy Policy
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: March 30, 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none">
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
    </main>
  );
}
