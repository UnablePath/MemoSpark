'use client';

import type React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  return (
    <motion.article
      layout={reducedMotion ? false : 'position'}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative rounded-xl border border-primary/25 bg-primary/[0.04] dark:bg-primary/[0.06]',
        'px-4 py-3.5',
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
          <h4 className="text-[0.95rem] font-semibold leading-snug text-foreground">
            {suggestion.title}
          </h4>
          {suggestion.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2 max-w-[60ch]">
              {suggestion.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => onAccept(suggestion)}
              className="h-8 gap-1.5 active:scale-[0.97] transition-transform"
            >
              Add to tasks
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(suggestion)}
              className="h-8 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
            >
              Not now
            </Button>
            {tierBadge && (
              <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                {tierBadge.remaining} left today
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(suggestion)}
          className={cn(
            'absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground',
            'hover:bg-muted hover:text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
          aria-label={`Dismiss suggestion: ${suggestion.title}`}
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </motion.article>
  );
};
