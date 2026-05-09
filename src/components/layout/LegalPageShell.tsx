import Link from "next/link";
import type { ReactNode } from "react";
import { HomepageNavbar } from "@/components/layout/HomepageNavbar";

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function LegalPageShell({ title, subtitle, children }: LegalPageShellProps) {
  return (
    <div className="app-container min-h-screen w-full bg-background text-foreground" data-marketing-home>
      <HomepageNavbar />
      <main className="pt-16">
        <section className="w-full py-16 md:py-20">
          <div className="responsive-container">
            <div className="mb-8 border-b border-border/60 pb-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Legal
              </p>
              <h1 className="text-3xl font-black tracking-tighter md:text-4xl">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">{subtitle}</p>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4 hover:text-foreground">
                Home
              </Link>
              {" · "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-foreground">
                Contact
              </Link>
            </p>

            <article className="rounded-3xl border border-border/70 bg-card p-6 shadow-sm md:p-8">
              <div className="prose prose-neutral max-w-none dark:prose-invert">{children}</div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
