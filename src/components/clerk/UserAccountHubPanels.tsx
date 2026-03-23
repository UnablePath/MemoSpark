'use client';

import Link from 'next/link';
import { ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shouldEmbedHubRoute, useViewportSize } from '@/hooks/useViewportSize';

export interface UserAccountHubPanelProps {
  /** Short label (e.g. “App settings”) */
  title: string;
  /** Friendly explainer */
  body: string;
  href: string;
  /** Primary action when not embedding */
  linkLabel: string;
  /** `title` on the iframe for screen readers */
  iframeTitle: string;
}

function buildEmbedSrc(href: string): string {
  const normalized = href.startsWith('/') ? href : `/${href}`;
  const [path, query] = normalized.split('?');
  const params = new URLSearchParams(query ?? '');
  params.set('embed', '1');
  const q = params.toString();
  return `${path}?${q}`;
}

/**
 * MemoSpark routes inside Clerk’s UserProfile modal.
 * Embed eligibility uses measured viewport (`shouldEmbedHubRoute`). Iframe height follows **flex** from the modal shell (no fixed vh slice on desktop).
 */
export function UserAccountHubPanel({
  title,
  body,
  href,
  linkLabel,
  iframeTitle,
}: UserAccountHubPanelProps) {
  const { width: vw, height: vh, ready } = useViewportSize();
  const canEmbed = ready && shouldEmbedHubRoute(vw, vh);
  const tightIntro = vw < 720 || vh < 700;

  const embedSrc = buildEmbedSrc(href);

  return (
    <div
      data-memospark-hub-panel
      className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden [flex-basis:0]"
    >
      <div
        className={
          tightIntro
            ? 'shrink-0 border-b border-border/50 bg-muted/50 px-2.5 py-1.5 sm:px-3'
            : 'shrink-0 border-b border-border/50 bg-muted/50 px-3 py-2 sm:px-3.5 sm:py-2'
        }
      >
        <div className="flex items-start gap-2">
          <Sparkles
            className={
              tightIntro
                ? 'mt-0.5 h-3.5 w-3.5 shrink-0 text-primary'
                : 'mt-0.5 h-4 w-4 shrink-0 text-primary'
            }
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight text-foreground">{title}</p>
            <p
              className={
                tightIntro
                  ? 'mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2'
                  : 'mt-1 text-xs leading-snug text-muted-foreground line-clamp-2 sm:line-clamp-3'
              }
            >
              {body}
            </p>
          </div>
        </div>
      </div>

      {!ready && (
        <div className="min-h-[10rem] flex-1 animate-pulse bg-muted/15" aria-hidden />
      )}

      {ready && canEmbed && (
        <div
          data-memospark-hub-iframe-wrap
          className="flex min-h-0 w-full min-w-0 flex-1 flex-col [flex-basis:0]"
        >
          <iframe
            title={iframeTitle}
            src={embedSrc}
            className="block h-full min-h-0 w-full min-w-0 flex-1 border-0 bg-background [flex-basis:0]"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}

      {ready && !canEmbed && (
        <div className="flex min-h-[10rem] flex-1 flex-col justify-center gap-3 px-3 py-4">
          <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-sm">
            On a phone-sized screen, use the full page for the best layout. Same content, easier to tap and scroll.
          </p>
          <Button asChild size="lg" className="mx-auto w-full max-w-md touch-manipulation shadow-sm">
            <Link href={href}>{linkLabel}</Link>
          </Button>
        </div>
      )}

      {ready && canEmbed && (
        <div className="shrink-0 border-t border-border/60 bg-background/95 px-2.5 py-1.5 backdrop-blur-sm sm:px-2 sm:py-2">
          <Button asChild variant="outline" size="sm" className="w-full touch-manipulation sm:w-auto">
            <Link href={href}>
              {linkLabel}
              <ExternalLink className="ml-2 inline h-3.5 w-3.5 opacity-80" aria-hidden />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
