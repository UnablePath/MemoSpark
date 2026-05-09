'use client';

import { cn } from '@/lib/utils';
import {
  connectionAvatarHue,
  connectionDisplayInitials,
  connectionSenderTail,
} from '@/lib/social/connectionDisplay';
import { submitSocialReport } from '@/lib/social/submitSocialReport';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  QUICK_REACTIONS,
  type RealtimeChatMessage,
  type ReactionGroup,
} from '@/components/social/chat/realtime-chat-types';
import {
  ArrowBendUpLeft,
  Check,
  Checks,
  DotsThreeVertical,
  Flag,
  PencilSimple,
  Smiley,
  Trash,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';

interface ChatMessageItemProps {
  message: RealtimeChatMessage;
  isOwnMessage: boolean;
  showHeader: boolean;
  onReply?: (messageId: string, content: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  repliedMessageContent?: string;
  /** Hide reactions/edit/delete (e.g., when chat is read-only). */
  readOnly?: boolean;
}

const ACCENT = '#1a9e6e';

export function ChatMessageItem({
  message,
  isOwnMessage,
  showHeader,
  onReply,
  onReact,
  onEdit,
  onDelete,
  repliedMessageContent,
  readOnly,
}: ChatMessageItemProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const timeLabel = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isDeleted = Boolean(message.deletedAt);
  const wasEdited = Boolean(message.editedAt);

  // Close popovers when clicking outside.
  useEffect(() => {
    if (!showReactionPicker && !showActions) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(t)
      ) {
        setShowReactionPicker(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(t)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showReactionPicker, showActions]);

  // Auto-focus + size edit textarea.
  useEffect(() => {
    if (!isEditing) return;
    const el = editInputRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [isEditing]);

  const handleSelectReaction = (emoji: string) => {
    setShowReactionPicker(false);
    onReact?.(message.id, emoji);
  };

  const handleToggleReaction = (group: ReactionGroup) => {
    onReact?.(message.id, group.emoji);
  };

  const handleStartEdit = () => {
    setShowActions(false);
    setEditValue(message.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const next = editValue.trim();
    if (!next || next === message.content) {
      setIsEditing(false);
      return;
    }
    onEdit?.(message.id, next);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(message.content);
  };

  const handleDelete = () => {
    setShowActions(false);
    onDelete?.(message.id);
  };

  const submitMessageReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await submitSocialReport({
        targetType: 'message',
        targetId: message.id,
        reason: reportReason.trim(),
        context: {
          source: 'realtime_chat',
          sender_id: message.senderId,
        },
      });
      toast.success('Message report sent.');
      setReportOpen(false);
      setReportReason('');
    } catch (error) {
      console.error('[social:reportMessage]', error);
      toast.error("Couldn't report this message right now. Try again.");
    }
  };

  const avatarHue = connectionAvatarHue(
    message.senderId ?? message.user.name ?? '',
  );
  const avatarGlyph = connectionDisplayInitials(message.user.name);
  const senderTail = connectionSenderTail(message.senderId);
  const avatarLabel =
    senderTail && message.senderId
      ? `${message.user.name} · ${senderTail}`
      : message.user.name;

  return (
    <>
    <div
      className={cn(
        'group flex gap-2 px-1',
        isOwnMessage ? 'flex-row-reverse' : 'flex-row',
        showHeader ? 'mt-4' : 'mt-0.5',
      )}
    >
      {/* Avatar + disambiguator */}
      {showHeader ? (
        <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-tight text-white',
              isOwnMessage
                ? 'ring-1 ring-[color:var(--ms-chat-accent)]/35'
                : 'ring-1 ring-border/40',
            )}
            style={{
              ['--ms-chat-accent' as string]: ACCENT,
              backgroundColor: isOwnMessage
                ? `color-mix(in srgb, ${ACCENT} 85%, black)`
                : `hsl(${avatarHue} 38% 38%)`,
            }}
            aria-label={avatarLabel}
            title={avatarLabel}
          >
            {avatarGlyph}
          </div>
          {senderTail ? (
            <span
              className="max-w-[2.25rem] truncate text-center text-[8px] font-mono leading-none text-muted-foreground tabular-nums"
              aria-hidden
            >
              {senderTail}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="w-8 shrink-0" aria-hidden />
      )}

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-0.5 sm:max-w-[72%]',
          isOwnMessage ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name + timestamp */}
        {showHeader && (
          <div
            className={cn(
              'flex items-center gap-1.5 px-1',
              isOwnMessage ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <span className="text-[11px] font-semibold leading-none text-foreground/80">
              {message.user.name}
            </span>
            <span className="text-[10px] leading-none text-muted-foreground/60 tabular-nums">
              {timeLabel}
            </span>
          </div>
        )}

        {/* Reply context */}
        {message.replyToId && repliedMessageContent && (
          <div
            className={cn(
              'flex max-w-full items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5',
              isOwnMessage ? 'self-end' : 'self-start',
            )}
          >
            <div
              className="h-3 w-0.5 shrink-0 rounded-full"
              style={{ backgroundColor: `${ACCENT}b2` }}
            />
            <span className="truncate text-[11px] italic text-muted-foreground">
              {repliedMessageContent}
            </span>
          </div>
        )}

        {/* Message actions — above bubble so the row never overlaps the bubble */}
        {!readOnly && !isDeleted && !isEditing && (
          <div
            className={cn(
              'flex w-full min-h-[28px] items-center gap-0.5 opacity-0 transition-opacity',
              'group-hover:opacity-100 group-focus-within:opacity-100',
              isOwnMessage ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full border border-border/50 bg-background/95 px-1 py-0.5 shadow-sm backdrop-blur-sm',
              )}
            >
              {onReact && (
                <div className="relative" ref={reactionPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowReactionPicker((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="Add reaction"
                    aria-expanded={showReactionPicker}
                  >
                    <Smiley weight="bold" className="h-4 w-4" aria-hidden />
                  </button>

                  {showReactionPicker && (
                    <div
                      role="dialog"
                      aria-label="Reactions"
                      className={cn(
                        'absolute z-[13020] flex gap-0.5 rounded-full border border-border/60 bg-background/98 p-1 shadow-lg backdrop-blur',
                        'top-full mt-1.5',
                        isOwnMessage ? 'right-0' : 'left-0',
                      )}
                    >
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleSelectReaction(emoji)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-base transition-transform hover:scale-110 hover:bg-muted/60 active:scale-95"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(message.id, message.content)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="Reply to message"
                >
                  <ArrowBendUpLeft weight="bold" className="h-4 w-4" aria-hidden />
                </button>
              )}

              {!isOwnMessage && (
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(true);
                    setReportReason('');
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="Report message"
                >
                  <Flag weight="bold" className="h-4 w-4" aria-hidden />
                </button>
              )}

              {(onEdit || onDelete) && isOwnMessage && (
                <div className="relative" ref={actionsMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowActions((v) => !v)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:bg-muted/60 hover:text-foreground"
                    aria-label="More actions"
                    aria-expanded={showActions}
                  >
                    <DotsThreeVertical weight="bold" className="h-4 w-4" aria-hidden />
                  </button>

                  {showActions && (
                    <div
                      role="menu"
                      className={cn(
                        'absolute z-[13020] min-w-[128px] rounded-lg border border-border/60 bg-background/98 py-1 shadow-lg backdrop-blur',
                        'top-full mt-1.5',
                        isOwnMessage ? 'right-0' : 'left-0',
                      )}
                    >
                      {onEdit && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleStartEdit}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60"
                        >
                          <PencilSimple weight="bold" className="h-3.5 w-3.5" aria-hidden />
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleDelete}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-500/10"
                        >
                          <Trash weight="bold" className="h-3.5 w-3.5" aria-hidden />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message bubble */}
        {isEditing ? (
            <div
              className={cn(
                'flex flex-col gap-1 rounded-2xl border border-border/60 bg-muted/40 p-2',
                isOwnMessage ? 'rounded-br-sm' : 'rounded-bl-sm',
              )}
              style={{ minWidth: 220 }}
            >
              <textarea
                ref={editInputRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelEdit();
                  }
                }}
                rows={1}
                className="resize-none bg-transparent px-1 text-sm leading-relaxed outline-none"
                aria-label="Edit message"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-md px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white transition-all"
                  style={{ backgroundColor: ACCENT }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                isOwnMessage
                  ? 'rounded-br-sm shadow-sm'
                  : 'rounded-bl-sm bg-muted/70 text-foreground shadow-sm',
                isDeleted && 'italic opacity-60',
              )}
              style={
                isOwnMessage && !isDeleted
                  ? {
                      backgroundColor: ACCENT,
                      color: 'white',
                      boxShadow: `0 1px 2px ${ACCENT}33`,
                    }
                  : undefined
              }
            >
              <span className="whitespace-pre-wrap break-words">
                {isDeleted ? 'This message was deleted.' : message.content}
              </span>

              {/* Inline timestamp + edited tag */}
              {!showHeader && !isDeleted && (
                <span
                  className={cn(
                    'ml-2 inline-block text-[10px] leading-none tabular-nums',
                    isOwnMessage ? 'text-white/55' : 'text-muted-foreground/55',
                  )}
                >
                  {timeLabel}
                </span>
              )}
              {wasEdited && !isDeleted && (
                <span
                  className={cn(
                    'ml-1.5 text-[10px] italic',
                    isOwnMessage ? 'text-white/50' : 'text-muted-foreground/50',
                  )}
                >
                  edited
                </span>
              )}

              {/* Read receipt */}
              {isOwnMessage && !isDeleted && (
                <span className="ml-1.5 inline-flex items-center align-middle">
                  {message.read ? (
                    <Checks weight="bold" className="h-3 w-3 text-white/75" aria-label="Read" />
                  ) : (
                    <Check weight="bold" className="h-3 w-3 text-white/45" aria-label="Sent" />
                  )}
                </span>
              )}
            </div>
          )}

        {/* Reactions row */}
        {!isDeleted && message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1 pt-1',
              isOwnMessage ? 'justify-end' : 'justify-start',
            )}
          >
            {message.reactions.map((group) => (
              <button
                key={group.emoji}
                type="button"
                onClick={() => handleToggleReaction(group)}
                disabled={readOnly || !onReact}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                  'tabular-nums leading-none',
                  group.byMe
                    ? 'border-[color:var(--ms-chat-accent)]/40 bg-[color:var(--ms-chat-accent)]/10 text-foreground'
                    : 'border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60',
                  (readOnly || !onReact) && 'cursor-default',
                )}
                style={{ ['--ms-chat-accent' as string]: ACCENT }}
                aria-label={`${group.emoji} ${group.count} reaction${group.count === 1 ? '' : 's'}${group.byMe ? ', toggled on' : ''}`}
                aria-pressed={group.byMe}
              >
                <span className="text-sm leading-none">{group.emoji}</span>
                <span>{group.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>

    <Dialog
      open={reportOpen}
      onOpenChange={(open) => {
        if (!open) {
          setReportOpen(false);
          setReportReason('');
        }
      }}
    >
      <DialogContent
        overlayClassName="z-[14000]"
        className="z-[14001] max-w-md rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle>Report this message</DialogTitle>
          <DialogDescription>
            Tell us what needs review. We read every report.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`message-report-${message.id}`}>What happened?</Label>
          <Textarea
            id={`message-report-${message.id}`}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="A few clear sentences help us review quickly."
            className="min-h-[100px] rounded-xl"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setReportOpen(false);
              setReportReason('');
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!reportReason.trim()}
            onClick={() => void submitMessageReport()}
          >
            Send report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
