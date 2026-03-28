'use client';

import Link from 'next/link';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';
import { Button } from '@/components/ui/button';
import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs';
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
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-[#0c0e13]/90 shadow-sm backdrop-blur-lg">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between h-12 sm:h-14 md:h-16">
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13]" aria-label="MemoSpark Home">
            <MemoSparkLogoSvg height={23} darkBackground className="sm:h-6 md:h-7" />
          </Link>
          <Link
            href="/coming-soon"
            className="rounded-sm text-[10px] text-white/45 transition-colors hover:text-emerald-400/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0e13] sm:text-xs"
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
                  "rounded-md px-2 py-1.5 text-xs font-medium text-white/50 transition-all duration-150 hover:bg-emerald-500/10 hover:text-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13] lg:px-3 lg:py-2 lg:text-sm",
                  pathname === link.href && "bg-emerald-500/15 text-emerald-300"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-xs font-medium text-white/70 hover:bg-emerald-500/10 hover:text-emerald-200 lg:text-sm">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500 lg:text-sm">Sign Up Free</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full hover:bg-emerald-500/10">
                  <span className="sr-only">Open account menu</span>
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
            </Show>
          </div>
        </div>

        {/* Mobile Menu Button and Profile for authenticated users */}
        <div className="md:hidden flex items-center space-x-2">
          <Show when="signed-in">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-emerald-500/10">
                  <span className="sr-only">Open account menu</span>
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
          </Show>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            className="h-8 w-8 bg-white/[0.06] text-white hover:bg-emerald-500/10"
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="border-t border-white/[0.08] bg-[#0c0e13] shadow-lg md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-all duration-150 hover:bg-emerald-500/10 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0e13]",
                  pathname === link.href && "bg-emerald-500/15 text-emerald-200"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/coming-soon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-md px-3 py-2 text-sm font-medium text-white/45 transition-all duration-150 hover:bg-emerald-500/10 hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0e13]"
              aria-label="Learn more about PromptU, the creators of MemoSpark (Coming Soon)"
            >
              by PromptU
            </Link>
          </div>
          <div className="border-t border-white/[0.08] px-2 pb-3 pt-2">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="mb-2 w-full border-white/15 bg-transparent font-medium text-white hover:bg-emerald-500/10 hover:text-emerald-200">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm" className="w-full bg-emerald-600 font-medium text-white hover:bg-emerald-500">Sign Up Free</Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mb-2 w-full border-white/15 bg-transparent font-medium text-white hover:bg-emerald-500/10 hover:text-emerald-200"
              >
                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
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