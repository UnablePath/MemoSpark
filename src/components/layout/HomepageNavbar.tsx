'use client';

import Link from 'next/link';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import { Button } from '@/components/ui/button';
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Menu, X, Settings, User } from 'lucide-react';
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function HomepageNavbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="bg-background/90 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between h-12 sm:h-14 md:h-16">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md" aria-label="MemoSpark Home">
            <MemoSparkLogoSvg height={24} darkBackground={false} className="sm:h-7 md:h-8" />
          </Link>
          <Link
            href="/coming-soon"
            className="text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
            aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
          >
            by PromptU
          </Link>
        </div>

        {/* Wrapper for all right-aligned items on desktop */}
        <div className="hidden md:flex items-center space-x-2 lg:space-x-4">
          {/* Desktop Menu */}
          <div className="flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs lg:text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  pathname === link.href && "text-primary bg-primary/10"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-xs lg:text-sm font-medium hover:bg-primary/10 text-foreground hover:text-primary">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="text-xs lg:text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">Sign Up Free</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-primary/10">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SignedIn>
          </div>
        </div>

        {/* Mobile Menu Button and Profile for authenticated users */}
        <div className="md:hidden flex items-center space-x-2">
          <SignedIn>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-primary/10 bg-muted/50">
                  <User className="h-4 w-4 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SignedIn>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="h-8 w-8 hover:bg-primary/10 bg-muted/50 text-foreground"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  pathname === link.href && "text-primary bg-primary/10"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/coming-soon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
              aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
            >
              by PromptU
            </Link>
          </div>
          <div className="px-2 pb-3 pt-2 border-t border-border/40">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="w-full mb-2 font-medium bg-background text-foreground border-border hover:bg-muted/50 hover:text-primary">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="w-full font-medium bg-primary text-primary-foreground hover:bg-primary/90">Sign Up Free</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" passHref legacyBehavior>
                 <Button variant="outline" size="sm" className="w-full mb-2 font-medium bg-background text-foreground border-border hover:bg-muted/50 hover:text-primary" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
} 