'use client';

import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { ChevronDown, ChevronUp, Filter, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SuggestionCard } from './SuggestionCard';
import type { AISuggestion } from '@/types/ai';

const suggestionListVariants = cva(
  "space-y-3 transition-all duration-300",
  {
    variants: {
      layout: {
        default: "space-y-3",
        compact: "space-y-2",
        grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0"
      },
      maxHeight: {
        none: "",
        limited: "max-h-96 overflow-y-auto",
        compact: "max-h-64 overflow-y-auto"
      }
    },
    defaultVariants: {
      layout: "default",
      maxHeight: "none"
    }
  }
);

const headerVariants = cva(
  "flex items-center justify-between p-4 bg-muted/30 rounded-lg border",
  {
    variants: {
      style: {
        default: "bg-muted/30",
        minimal: "bg-transparent border-0 p-2",
        highlighted: "bg-[hsl(142,60%,97%)] border-[hsl(142,60%,40%)]/20 dark:bg-[hsl(142,60%,8%)]"
      }
    },
    defaultVariants: {
      style: "default"
    }
  }
);

interface SuggestionListProps extends VariantProps<typeof suggestionListVariants> {
  suggestions: AISuggestion[];
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onRefresh?: () => void;
  title?: string;
  emptyMessage?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  showReasoning?: boolean;
  isLoading?: boolean;
  collapsible?: boolean;
  headerStyle?: VariantProps<typeof headerVariants>['style'];
  className?: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRefresh,
  title = "AI Suggestions",
  emptyMessage = "No suggestions available right now. Check back later!",
  showHeader = true,
  showFilters = false,
  showReasoning = false,
  isLoading = false,
  collapsible = false,
  layout,
  maxHeight,
  headerStyle = "default",
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'priority' | 'created'>('confidence');

  // Filter and sort suggestions
  const filteredSuggestions = React.useMemo(() => {
    let filtered = suggestions;

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(s => s.priority === filterPriority);
    }

    // Sort suggestions
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          const confidenceA = typeof a.confidence === 'number' ? a.confidence : 0;
          const confidenceB = typeof b.confidence === 'number' ? b.confidence : 0;
          return confidenceB - confidenceA;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 } as const;
          const priorityAKey = a.priority && (a.priority in priorityOrder) ? a.priority as keyof typeof priorityOrder : 'medium';
          const priorityBKey = b.priority && (b.priority in priorityOrder) ? b.priority as keyof typeof priorityOrder : 'medium';
          return priorityOrder[priorityBKey] - priorityOrder[priorityAKey];
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [suggestions, filterPriority, sortBy]);

  const getSuggestionStats = () => {
    const total = suggestions.length;
    const high = suggestions.filter(s => s.priority === 'high').length;
    const pending = suggestions.filter(s => s.acceptanceStatus === 'pending').length;
    return { total, high, pending };
  };

  const stats = getSuggestionStats();

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {showHeader && (
          <div className={cn(headerVariants({ style: headerStyle }))}>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-[hsl(142,60%,40%)]" />
              <h3 className="font-semibold text-sm">Loading suggestions...</h3>
            </div>
          </div>
        )}
        
        {/* Loading skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-muted/30 rounded-xl animate-pulse"
              aria-label="Loading suggestion"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} role="region" aria-label="AI Suggestions">
      {showHeader && (
        <div className={cn(headerVariants({ style: headerStyle }))}>
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm">{title}</h3>
            
            {stats.total > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-[hsl(142,60%,40%)] text-white text-xs font-medium">
                  {stats.total}
                </span>
                {stats.high > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-medium">
                    {stats.high} urgent
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showFilters && stats.total > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1 bg-background"
                  aria-label="Filter by priority"
                >
                  <option value="all">All priorities</option>
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1 bg-background"
                  aria-label="Sort suggestions"
                >
                  <option value="confidence">By confidence</option>
                  <option value="priority">By priority</option>
                  <option value="created">By date</option>
                </select>
              </div>
            )}

            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
                aria-label="Refresh suggestions"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}

            {collapsible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
                aria-label={isCollapsed ? "Expand suggestions" : "Collapse suggestions"}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {!isCollapsed && (
        <>
          {filteredSuggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-muted-foreground mb-2">
                {suggestions.length === 0 ? "No suggestions yet" : "No matching suggestions"}
              </h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                {emptyMessage}
              </p>
              {onRefresh && suggestions.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Get suggestions
                </Button>
              )}
            </div>
          ) : (
            <div className={cn(suggestionListVariants({ layout, maxHeight }))}>
              {filteredSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={onAcceptSuggestion}
                  onReject={onRejectSuggestion}
                  showReasoning={showReasoning}
                  compact={layout === "compact"}
                />
              ))}
            </div>
          )}

          {filteredSuggestions.length > 0 && suggestions.length !== filteredSuggestions.length && (
            <div className="mt-3 p-3 bg-muted/20 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                Showing {filteredSuggestions.length} of {suggestions.length} suggestions
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 