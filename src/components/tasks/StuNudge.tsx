'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTexturaPretext } from '@/components/providers/textura-pretext-provider';
import type { AISuggestion } from '@/types/ai';

export interface StuNudgeProps {
  suggestion: AISuggestion;
  onAccept: (suggestion: AISuggestion) => void | Promise<void>;
  onDismiss: (suggestion: AISuggestion) => void | Promise<void>;
  tierBadge?: { tier: 'free' | 'premium' | 'enterprise'; remaining: number } | null;
  className?: string;
}

/**
 * Inline nudge card shown in the Today agenda. Two primary actions: accept (creates or
 * applies the suggestion) and dismiss. One visual rhythm only; no gradients, no
 * gradient text, no accent stripes. Tier badge is optional and footer-only.
 */
export const StuNudge: React.FC<StuNudgeProps> = ({
  suggestion,
  onAccept,
  onDismiss,
  tierBadge,
  className,
}) => {
  const reducedMotion = useReducedMotion();
  const { measureText } = useTexturaPretext();
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [descriptionClampable, setDescriptionClampable] = useState(false);

  useEffect(() => {
    const el = descriptionRef.current;
    const text = suggestion.description?.trim();
    if (!el || !text) {
      setDescriptionClampable(false);
      return;
    }

    const update = () => {
      const width = Math.max(0, Math.floor(el.getBoundingClientRect().width));
      if (width < 48) return;
      const { lineCount } = measureText({
        text,
        // Match dashboard `font-sans` (Geist) so clamp matches rendered lines.
        font: '400 14px Geist, ui-sans-serif, system-ui, sans-serif',
        width,
        lineHeight: 22,
      });
      setDescriptionClampable(lineCount > 2);
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, [measureText, suggestion.description]);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [suggestion.id, suggestion.description]);

  return (
    <motion.article
      layout={reducedMotion ? false : 'position'}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative rounded-xl border border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.06]',
        'px-4 py-3.5 shadow-sm',
        className,
      )}
      aria-label={`Suggestion: ${suggestion.title}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 shrink-0 rounded-md bg-primary/10 p-1.5"
          aria-hidden="true"
        >
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold leading-tight tracking-tight text-foreground">
            {suggestion.title}
          </h4>
          {suggestion.description && (
            <div className="mt-1.5 min-w-0 max-w-[min(65ch,100%)]">
              <p
                ref={descriptionRef}
                className={cn(
                  'text-sm leading-relaxed text-muted-foreground',
                  !descriptionExpanded && descriptionClampable && 'line-clamp-2',
                )}
              >
                {suggestion.description}
              </p>
              {descriptionClampable && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((e) => !e)}
                  className="mt-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {descriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full flex-col gap-2 xs:flex-row sm:w-auto">
              <Button
                size="sm"
                onClick={() => onAccept(suggestion)}
                className="h-11 w-full gap-1.5 active:scale-[0.97] transition-transform sm:h-8 sm:w-auto"
              >
                Add to tasks
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(suggestion)}
                className="h-11 w-full text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform sm:h-8 sm:w-auto"
              >
                Not now
              </Button>
            </div>
            {tierBadge && (
              <span className="text-xs text-muted-foreground tabular-nums sm:ml-auto">
                {tierBadge.remaining} left today
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(suggestion)}
          className={cn(
            'absolute right-2 top-2 rounded-md p-2 text-muted-foreground touch-manipulation',
            'hover:bg-muted hover:text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0 sm:p-1.5',
          )}
          aria-label={`Dismiss suggestion: ${suggestion.title}`}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </motion.article>
  );
};
