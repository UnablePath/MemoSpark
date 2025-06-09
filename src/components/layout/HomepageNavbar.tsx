'use client';

import Link from 'next/link';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import { Button } from '@/components/ui/button';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react'
export function HomepageNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="bg-background/90 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 md:h-20">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md" aria-label="MemoSpark Home">
            <MemoSparkLogoSvg height={32} />
          </Link>
          <Link
            href="/coming-soon"
            className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
            aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
          >
            by PromptU
          </Link>
        </div>

        {/* Wrapper for all right-aligned items on desktop */}
        <div className="hidden md:flex items-center space-x-4"> {/* Adjusted spacing if needed */}
          {/* Desktop Menu */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  pathname === link.href && "text-primary bg-primary/10"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-sm font-medium hover:bg-primary/5">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="text-sm font-medium">Sign Up Free</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              {/* <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonPopoverCard: 'mt-2' } }} /> REMOVED */}
            </SignedIn>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="hover:bg-primary/5"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border/40 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)} // Close menu on link click
                className={cn(
                  "block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  pathname === link.href && "text-primary bg-primary/10"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/coming-soon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
            >
              by PromptU
            </Link>
          </div>
          <div className="px-2 pb-3 pt-2 border-t border-border/40">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" className="w-full mb-2 font-medium">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button className="w-full font-medium">Sign Up Free</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              {/* For mobile, UserButton might be too large or we might want direct links */}
              {/* Option 1: Just the UserButton */}
              {/* <UserButton afterSignOutUrl="/" showName={false} /> */}
              {/* Option 2: Simpler links or redirect to dashboard */}
              <Link href="/dashboard" passHref legacyBehavior>
                 <Button variant="outline" className="w-full mb-2 font-medium" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Button>
              </Link>
              {/* Consider how to handle sign out here if not using full UserButton */}
              {/* A simple sign out button can be added using useClerk().signOut() */}
               {/* <div className="mt-2">
                <UserButton afterSignOutUrl="/" showName={true} />
               </div> REMOVED UserButton from mobile menu as well */}
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
} 