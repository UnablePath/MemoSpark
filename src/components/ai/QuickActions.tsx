'use client';

import type React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { 
  Zap, 
  Clock, 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  Lightbulb,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AISuggestion, SuggestionType } from '@/types/ai';

const quickActionVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border",
        outline: "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        ghost: "hover:bg-primary/10 text-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0"
      },
      priority: {
        low: "opacity-80",
        medium: "",
        high: "ring-2 ring-primary/20 shadow-md"
      }
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
      priority: "medium"
    }
  }
);

const quickActionIcons = {
  study_time: Clock,
  break_reminder: Pause,
  task_suggestion: Target,
  difficulty_adjustment: TrendingUp,
  subject_focus: BookOpen,
  schedule_optimization: Brain,
  // Generic actions
  start_session: Play,
  take_break: Pause,
  review_progress: TrendingUp,
  get_hint: Lightbulb,
  quick_task: Zap,
  skip_suggestion: SkipForward
};

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof quickActionIcons;
  type: SuggestionType | 'start_session' | 'take_break' | 'review_progress' | 'get_hint' | 'quick_task' | 'skip_suggestion';
  priority: 'low' | 'medium' | 'high';
  variant?: VariantProps<typeof quickActionVariants>['variant'];
  disabled?: boolean;
  description?: string;
  estimatedTime?: number; // Minutes
}

interface QuickActionsProps extends VariantProps<typeof quickActionVariants> {
  actions?: QuickAction[];
  onActionClick: (actionType: string, actionData?: any) => void;
  suggestions?: AISuggestion[];
  isLoading?: boolean;
  compact?: boolean;
  maxActions?: number;
  showLabels?: boolean;
  className?: string;
}

const getDefaultActions = (suggestions: AISuggestion[] = []): QuickAction[] => {
  const actions: QuickAction[] = [
    {
      id: 'quick-study',
      label: 'Quick Study',
      icon: 'start_session',
      type: 'start_session',
      priority: 'high',
      variant: 'primary',
      description: 'Start a 25-minute focused study session',
      estimatedTime: 25
    },
    {
      id: 'take-break',
      label: 'Take Break',
      icon: 'take_break',
      type: 'take_break',
      priority: 'medium',
      variant: 'secondary',
      description: 'Take a 5-minute mindful break',
      estimatedTime: 5
    },
    {
      id: 'get-hint',
      label: 'Get Hint',
      icon: 'get_hint',
      type: 'get_hint',
      priority: 'medium',
      variant: 'outline',
      description: 'Get a personalized study tip'
    }
  ];

  // Add suggestion-based quick actions
  if (suggestions.length > 0) {
    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
    
    if (highPrioritySuggestions.length > 0) {
      const topSuggestion = highPrioritySuggestions[0];
      actions.unshift({
        id: `suggestion-${topSuggestion.id}`,
        label: topSuggestion.title.length > 15 ? `${topSuggestion.title.slice(0, 15)}...` : topSuggestion.title,
        icon: topSuggestion.type as keyof typeof quickActionIcons,
        type: topSuggestion.type,
        priority: 'high',
        variant: 'primary',
        description: topSuggestion.description,
        estimatedTime: topSuggestion.duration
      });
    }
  }

  return actions;
};

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  onActionClick,
  suggestions = [],
  isLoading = false,
  compact = false,
  maxActions = 4,
  showLabels = true,
  size,
  variant,
  priority,
  className
}) => {
  const defaultActions = getDefaultActions(suggestions);
  const displayActions = (actions || defaultActions).slice(0, maxActions);

  const handleActionClick = (action: QuickAction) => {
    if (action.disabled || isLoading) return;
    
    const actionData = {
      type: action.type,
      label: action.label,
      description: action.description,
      estimatedTime: action.estimatedTime,
      suggestionId: action.id.startsWith('suggestion-') ? action.id.replace('suggestion-', '') : undefined
    };
    
    onActionClick(action.type, actionData);
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", compact ? "gap-1" : "gap-2", className)}>
        {Array.from({ length: Math.min(maxActions, 3) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-10 rounded-lg bg-muted/30 animate-pulse",
              compact ? "w-10" : "w-24"
            )}
          />
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div 
        className={cn("flex items-center gap-1", className)}
        role="toolbar"
        aria-label="Quick actions"
      >
        {displayActions.map((action) => {
          const IconComponent = quickActionIcons[action.icon] || Zap;
          
          return (
            <Button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={action.disabled || isLoading}
              className={cn(
                quickActionVariants({ 
                  variant: action.variant || variant,
                  size: "icon",
                  priority: action.priority || priority
                })
              )}
              title={`${action.label}${action.description ? ` - ${action.description}` : ''}`}
              aria-label={action.label}
            >
              <IconComponent className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className={cn("flex flex-wrap items-center gap-2", className)}
      role="toolbar"
      aria-label="Quick actions"
    >
      {displayActions.map((action) => {
        const IconComponent = quickActionIcons[action.icon] || Zap;
        
        return (
          <Button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={action.disabled || isLoading}
            className={cn(
              quickActionVariants({ 
                variant: action.variant || variant,
                size: size,
                priority: action.priority || priority
              })
            )}
            title={action.description}
            aria-describedby={action.description ? `${action.id}-desc` : undefined}
          >
            <IconComponent className="w-4 h-4" />
            {showLabels && (
              <span className="truncate max-w-[100px]">{action.label}</span>
            )}
            {action.estimatedTime && showLabels && (
              <span className="text-xs opacity-70">
                {action.estimatedTime}m
              </span>
            )}
            
            {action.description && (
              <span 
                id={`${action.id}-desc`}
                className="sr-only"
              >
                {action.description}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

// Export types for external use
export type { QuickAction };
export { quickActionIcons }; 