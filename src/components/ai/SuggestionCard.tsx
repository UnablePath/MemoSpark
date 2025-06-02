'use client';

import type React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, XCircle, Clock, Star, Info, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AISuggestion } from '@/types/ai';

const suggestionCardVariants = cva(
  "relative overflow-hidden transition-all duration-300 hover:shadow-lg group",
  {
    variants: {
      confidence: {
        high: "border-l-4 border-l-[hsl(142,60%,40%)] bg-gradient-to-r from-[hsl(142,60%,97%)] to-white dark:from-[hsl(142,60%,8%)] dark:to-card",
        medium: "border-l-4 border-l-[hsl(40,60%,60%)] bg-gradient-to-r from-[hsl(40,60%,97%)] to-white dark:from-[hsl(40,60%,8%)] dark:to-card", 
        low: "border-l-4 border-l-muted-foreground bg-gradient-to-r from-muted/30 to-white dark:from-muted/20 dark:to-card"
      },
      priority: {
        urgent: "ring-2 ring-destructive/20 shadow-md",
        high: "ring-1 ring-[hsl(142,60%,40%)]/20",
        medium: "ring-1 ring-muted/30",
        low: "border"
      },
      type: {
        study_time: "min-h-[100px]",
        break_reminder: "min-h-[90px]",
        task_suggestion: "min-h-[120px]",
        difficulty_adjustment: "min-h-[110px]",
        subject_focus: "min-h-[105px]",
        schedule_optimization: "min-h-[115px]",
        // Legacy compatibility
        suggestion: "min-h-[120px]",
        quick_action: "min-h-[80px]",
        insight: "min-h-[100px]",
        reminder: "min-h-[90px]"
      }
    },
    defaultVariants: {
      confidence: "medium",
      priority: "medium", 
      type: "task_suggestion"
    }
  }
);

const confidenceBadgeVariants = cva(
  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
  {
    variants: {
      confidence: {
        high: "bg-[hsl(142,60%,40%)] text-white",
        medium: "bg-[hsl(40,60%,60%)] text-white",
        low: "bg-muted text-muted-foreground"
      }
    }
  }
);

const suggestionIconMap = {
  study_time: Clock,
  break_reminder: Clock,
  task_suggestion: Star,
  difficulty_adjustment: ArrowRight,
  subject_focus: Info,
  schedule_optimization: ArrowRight,
  // Legacy compatibility
  suggestion: Star,
  quick_action: ArrowRight,
  insight: Info,
  reminder: Clock
} as const;

interface SuggestionCardProps extends VariantProps<typeof suggestionCardVariants> {
  suggestion: AISuggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  showReasoning?: boolean;
  compact?: boolean;
  className?: string;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  showReasoning = false,
  compact = false,
  confidence,
  priority,
  type,
  className
}) => {
  // Determine confidence level from suggestion
  const suggestionConfidence = confidence || 
    (suggestion.confidence >= 0.8 ? 'high' : 
     suggestion.confidence >= 0.5 ? 'medium' : 'low');

  // Determine priority from suggestion
  const suggestionPriority = priority || suggestion.priority || 'medium';

  // Determine type from suggestion
  const suggestionType = type || suggestion.type || 'task_suggestion';

  const IconComponent = suggestionIconMap[suggestionType] || Star;

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getConfidenceText = (level: string) => {
    switch (level) {
      case 'high': return 'High confidence';
      case 'medium': return 'Medium confidence';
      case 'low': return 'Low confidence';
      default: return 'Unknown confidence';
    }
  };

  if (compact) {
    return (
      <Card className={cn(
        suggestionCardVariants({ confidence: suggestionConfidence, priority: suggestionPriority, type: suggestionType }),
        "p-3",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full",
              suggestionConfidence === 'high' ? "bg-[hsl(142,60%,40%)]/10 text-[hsl(142,60%,40%)]" :
              suggestionConfidence === 'medium' ? "bg-[hsl(40,60%,60%)]/10 text-[hsl(40,60%,60%)]" :
              "bg-muted text-muted-foreground"
            )}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{suggestion.title}</p>
              <p className="text-xs text-muted-foreground truncate">{suggestion.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAccept(suggestion.id)}
              className="h-8 w-8 p-0 text-[hsl(142,60%,40%)] hover:bg-[hsl(142,60%,40%)]/10"
              aria-label={`Accept suggestion: ${suggestion.title}`}
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReject(suggestion.id)}
              className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Reject suggestion: ${suggestion.title}`}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        suggestionCardVariants({ confidence: suggestionConfidence, priority: suggestionPriority, type: suggestionType }),
        className
      )}
      role="article"
      aria-labelledby={`suggestion-title-${suggestion.id}`}
      aria-describedby={`suggestion-description-${suggestion.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl",
              suggestionConfidence === 'high' ? "bg-[hsl(142,60%,40%)]/10 text-[hsl(142,60%,40%)]" :
              suggestionConfidence === 'medium' ? "bg-[hsl(40,60%,60%)]/10 text-[hsl(40,60%,60%)]" :
              "bg-muted text-muted-foreground"
            )}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <CardTitle 
                id={`suggestion-title-${suggestion.id}`}
                className="text-base font-semibold leading-tight"
              >
                {suggestion.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(confidenceBadgeVariants({ confidence: suggestionConfidence }))}>
                  <Star className="w-3 h-3" />
                  {getConfidenceText(suggestionConfidence)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(suggestion.createdAt)}
                </span>
              </div>
            </div>
          </div>
          
          {suggestion.metadata?.estimatedBenefit && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Benefit</div>
              <div className="text-sm font-medium text-[hsl(142,60%,40%)]">
                +{Math.round(suggestion.metadata.estimatedBenefit * 100)}%
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <p 
          id={`suggestion-description-${suggestion.id}`}
          className="text-sm text-muted-foreground leading-relaxed"
        >
          {suggestion.description}
        </p>

        {showReasoning && suggestion.reasoning && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Why this suggestion?
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {suggestion.reasoning}
            </p>
          </div>
        )}

        {suggestion.metadata?.tags && suggestion.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {suggestion.metadata.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {suggestion.metadata.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{suggestion.metadata.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-2">
            {suggestion.metadata?.requiredAction && (
              <span className="text-xs text-muted-foreground capitalize">
                {suggestion.metadata.requiredAction} action
              </span>
            )}
            {suggestion.duration && (
              <span className="text-xs text-muted-foreground">
                • {suggestion.duration}min
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject(suggestion.id)}
              className="text-muted-foreground hover:text-destructive hover:border-destructive"
              aria-label={`Reject suggestion: ${suggestion.title}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Pass
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept(suggestion.id)}
              className="bg-[hsl(142,60%,40%)] hover:bg-[hsl(142,60%,35%)] text-white"
              aria-label={`Accept suggestion: ${suggestion.title}`}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Accept
            </Button>
          </div>
        </div>
      </CardFooter>

      {/* Subtle hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(142,60%,40%)]/0 to-[hsl(142,60%,40%)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  );
}; 