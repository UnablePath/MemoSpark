"use client";

import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import { Button } from "@/components/ui/button";
import {
  getMemoSparkDashboardUserButtonAppearance,
  getMemoSparkMarketingNavUserButtonAppearance,
  isMemoSparkDarkTheme,
} from "@/lib/clerk-appearance";
import { cn } from "@/lib/utils";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** Fixed 44×44 hit area; global `button { min-height: 44px }` + wrapper padding was stacking to ~52px and skewing the ring vs avatar. */
function marketingNavUserButtonShellClassName(isDark: boolean) {
  return cn(
    "flex h-11 w-11 shrink-0 items-center justify-center self-center overflow-hidden rounded-full p-0",
    isDark
      ? "bg-white/[0.04] ring-1 ring-inset ring-white/[0.12]"
      : "bg-transparent",
    "[&_.cl-rootBox]:flex [&_.cl-rootBox]:h-full [&_.cl-rootBox]:w-full [&_.cl-rootBox]:min-h-0 [&_.cl-rootBox]:items-center [&_.cl-rootBox]:justify-center",
    "[&_button.cl-userButtonTrigger]:!min-h-0 [&_button.cl-userButtonTrigger]:!min-w-0 [&_button.cl-userButtonTrigger]:!size-7 [&_button.cl-userButtonTrigger]:!p-0",
    "[&_.cl-userButtonAvatarBox]:!size-7 [&_.cl-userButtonAvatarImage]:!size-7",
  );
}

function MarketingNavUserButton({ isDark }: { isDark: boolean }) {
  return (
    <div className={marketingNavUserButtonShellClassName(isDark)}>
      <UserButton
        afterSignOutUrl="/"
        appearance={
          isDark
            ? getMemoSparkMarketingNavUserButtonAppearance()
            : getMemoSparkDashboardUserButtonAppearance(false)
        }
      />
    </div>
  );
}

export function HomepageNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, resolvedTheme } = useTheme();
  const isDark = isMemoSparkDarkTheme(resolvedTheme ?? theme);

  const navLinks = [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/80 bg-background/90 pt-safe-top shadow-sm backdrop-blur-lg">
      <div className="container mx-auto flex h-12 min-h-12 items-center justify-between px-3 sm:h-14 sm:min-h-14 md:h-16 md:min-h-16 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-1 sm:gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="MemoSpark Home"
          >
            <MemoSparkLogoSvg height={23} className="sm:h-6 md:h-7" />
          </Link>
          <Link
            href="/coming-soon"
            className="shrink-0 rounded-sm text-[10px] text-muted-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:text-xs"
            aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
          >
            by PromptU
          </Link>
        </div>

        <div className="hidden items-center space-x-2 md:flex lg:space-x-4">
          <div className="flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:px-3 lg:text-sm",
                  pathname === link.href && "bg-muted/80 text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground lg:text-sm"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  size="sm"
                  className="min-h-11 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 lg:text-sm"
                >
                  Sign Up Free
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <MarketingNavUserButton isDark={isDark} />
            </Show>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:hidden">
          <Show when="signed-in">
            <MarketingNavUserButton isDark={isDark} />
          </Show>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted/40 text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-border/80 bg-background shadow-lg md:hidden">
          <div className="space-y-1 px-2 pt-2 pb-3 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  pathname === link.href && "bg-muted/80 text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/coming-soon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground/80 transition-colors duration-150 hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
            >
              by PromptU
            </Link>
          </div>
          <div className="border-t border-border/80 px-2 pb-3 pt-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-2 min-h-11 w-full border-border/80 bg-transparent font-medium text-foreground hover:bg-muted/40"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  size="sm"
                  className="min-h-11 w-full bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Sign Up Free
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <div className="mb-2 flex flex-col gap-1">
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Settings
                </Link>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="min-h-11 w-full border-border/80 bg-transparent font-medium text-foreground hover:bg-muted/40"
              >
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              </Button>
            </Show>
          </div>
        </div>
      )}
    </nav>
  );
}
