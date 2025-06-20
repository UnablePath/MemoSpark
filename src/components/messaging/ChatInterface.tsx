"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FaTimes, 
  FaPaperPlane, 
  FaSmile, 
  FaReply, 
  FaEdit, 
  FaTrash,
  FaEllipsisV,
  FaCheck,
  FaCheckDouble,
  FaPaperclip
} from "react-icons/fa";
import { useAuth, useUser } from '@clerk/nextjs';
import { useMessagingService } from '@/lib/messaging/MessagingService';
import type { 
  Message,
  MessageWithDetails, 
  MessageReaction, 
  Conversation, 
  ConversationParticipant, 
  TypingIndicator as TypingIndicatorType 
} from '@/lib/messaging/MessagingService';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  Users
} from 'lucide-react';

interface ChatInterfaceProps {
  className?: string;
  initialConversationId?: string;
}

interface MessageBubbleProps {
  message: MessageWithDetails;
  isOwn: boolean;
  showAvatar: boolean;
  onReact: (messageId: string, reaction: string) => void;
  onReply: (message: MessageWithDetails) => void;
  onEdit: (message: MessageWithDetails) => void;
  onDelete: (messageId: string) => void;
}

// Emoji reactions
const REACTIONS = ['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🎉'];

// Message bubble component
const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  isOwn,
  showAvatar,
  onReact,
  onReply,
  onEdit,
  onDelete
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const getDeliveryIcon = () => {
    switch (message.delivery_status) {
      case 'sent':
        return <FaCheck className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <FaCheckDouble className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <FaCheckDouble className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const reactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    message.reactions?.forEach(reaction => {
      counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
    });
    return counts;
  }, [message.reactions]);

  return (
    <div className={cn("flex gap-2 mb-4", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarImage src={message.sender?.avatar_url} />
          <AvatarFallback>
            {message.sender?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
        <div className="relative group">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "relative px-4 py-2 rounded-2xl shadow-sm",
              isOwn 
                ? "bg-blue-500 text-white rounded-br-md" 
                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
            )}
          >
            {/* Reply indicator */}
            {message.reply_to_id && (
              <div className={cn(
                "text-xs opacity-75 mb-1 pb-1 border-b border-white/20",
                isOwn ? "text-white" : "text-gray-600 dark:text-gray-400"
              )}>
                ↳ Replying to message
              </div>
            )}

            {/* Message content */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {/* Edited indicator */}
            {message.edited_at && (
              <span className={cn(
                "text-xs opacity-60 ml-2",
                isOwn ? "text-white" : "text-gray-500"
              )}>
                (edited)
              </span>
            )}

            {/* Message actions menu */}
            <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1 bg-white dark:bg-gray-700 rounded-lg shadow-md p-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 p-0"
                        onClick={() => setShowReactions(!showReactions)}
                      >
                        <FaSmile className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add reaction</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-6 h-6 p-0"
                        onClick={() => onReply(message)}
                      >
                        <FaReply className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reply</TooltipContent>
                  </Tooltip>

                  {isOwn && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-6 h-6 p-0"
                            onClick={() => onEdit(message)}
                          >
                            <FaEdit className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-6 h-6 p-0 text-red-500 hover:text-red-600"
                            onClick={() => onDelete(message.id)}
                          >
                            <FaTrash className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </TooltipProvider>
              </div>
            </div>

            {/* Reaction picker */}
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-full mt-2 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-2 flex gap-1 z-10"
                >
                  {REACTIONS.map((emoji) => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="ghost"
                      className="w-8 h-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                      onClick={() => {
                        onReact(message.id, emoji);
                        setShowReactions(false);
                      }}
                    >
                      {emoji}
                    </Button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Message reactions */}
          {Object.keys(reactionCounts).length > 0 && (
            <div className="flex gap-1 mt-1">
              {Object.entries(reactionCounts).map(([reaction, count]) => (
                <Badge
                  key={reaction}
                  variant="secondary"
                  className="text-xs px-2 py-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => onReact(message.id, reaction)}
                >
                  {reaction} {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Message timestamp and delivery status */}
        <div className={cn(
          "flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{formatMessageTime(message.created_at)}</span>
          {isOwn && getDeliveryIcon()}
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Typing indicator component
const TypingIndicator: React.FC<{ typingUsers: TypingIndicatorType[] }> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
    >
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
      <span>
        {typingUsers.length === 1 
          ? 'Someone is typing...' 
          : `${typingUsers.length} people are typing...`
        }
      </span>
    </motion.div>
  );
};

// Main ChatInterface component
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className,
  initialConversationId
}) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const messagingService = useMessagingService();
  
  // State management
  const [conversations, setConversations] = useState<(Conversation & { 
    participants: ConversationParticipant[];
    last_message?: MessageWithDetails;
    unread_count: number;
  })[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicatorType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<MessageWithDetails | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const userConversations = await messagingService.getConversations(user.id);
      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, messagingService]);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setIsLoading(true);
      const conversationMessages = await messagingService.getMessages(conversationId);
      setMessages(conversationMessages.reverse()); // Reverse to show oldest first
      
      // Mark messages as read
      for (const message of conversationMessages) {
        if (message.sender_id !== user?.id && !message.read && user?.id) {
          await messagingService.markMessageAsRead(message.id, user.id);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [messagingService, user?.id]);

  // Subscribe to conversation updates
  const subscribeToConversation = useCallback((conversationId: string) => {
    // Unsubscribe from previous conversation
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to new conversation
    const unsubscribe = messagingService.subscribeToConversation(conversationId, {
      onMessage: (message: Message) => {
        setMessages(prev => [...prev, message as MessageWithDetails]);
        
        // Mark as read if not sent by current user
        if (message.sender_id !== user?.id && user?.id) {
          messagingService.markMessageAsRead(message.id, user.id);
        }
        
        setTimeout(scrollToBottom, 100);
      },
      onTyping: (typing: TypingIndicatorType[]) => {
        // Filter out current user's typing indicator
        const otherUsersTyping = typing.filter(t => t.user_id !== user?.id);
        setTypingUsers(otherUsersTyping);
      },
      onReaction: () => {
        // Reload messages to get updated reactions
        loadMessages(conversationId);
      },
      onMessageUpdate: (updatedMessage: Message) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, ...updatedMessage } as MessageWithDetails
              : msg
          )
        );
      }
    });

    unsubscribeRef.current = unsubscribe;
  }, [messagingService, user?.id, loadMessages, scrollToBottom]);

  // Handle conversation selection
  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId);
    setMessages([]);
    setTypingUsers([]);
    setReplyToMessage(null);
    loadMessages(conversationId);
    subscribeToConversation(conversationId);
  }, [loadMessages, subscribeToConversation]);

  // Handle sending message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    const recipientId = conversations
      .find(c => c.id === selectedConversation)
      ?.participants.find(p => p.user_id !== user.id)?.user_id;

    if (!recipientId) return;

    try {
      await messagingService.sendMessage({
        userId: user.id,
        recipientId,
        content: newMessage.trim(),
        conversationId: selectedConversation,
        replyToId: replyToMessage?.id
      });

      setNewMessage('');
      setReplyToMessage(null);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [newMessage, selectedConversation, user?.id, conversations, messagingService, replyToMessage, scrollToBottom]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!selectedConversation) return;

    setIsTyping(true);
    if (user?.id) {
      messagingService.updateTypingIndicator(selectedConversation, user.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (user?.id) {
        messagingService.updateTypingIndicator(selectedConversation, user.id, false);
      }
    }, 3000);
  }, [selectedConversation, messagingService, user?.id]);

  // Handle message editing
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      if (user?.id) {
        await messagingService.editMessage(messageId, newContent.trim(), user.id);
        setEditingMessageId(null);
        setEditingContent('');
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }, [messagingService, user?.id]);

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      if (user?.id) {
        await messagingService.deleteMessage(messageId, user.id);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, [messagingService, user?.id]);

  // Handle reaction
  const handleReaction = useCallback(async (messageId: string, reactionType: string) => {
    try {
      if (user?.id) {
        await messagingService.addReaction(messageId, user.id, reactionType);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [messagingService, user?.id]);

  // Initialize
  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (selectedConversation) {
      subscribeToConversation(selectedConversation);
    }
  }, [selectedConversation, subscribeToConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      messagingService.cleanup();
    };
  }, [messagingService]);

  // Get other participant info
  const getOtherParticipant = useCallback((conversation: Conversation & { participants: ConversationParticipant[] }) => {
    return conversation.participants.find(p => p.user_id !== user?.id);
  }, [user?.id]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (!user?.id) return;
    
    messages.forEach(message => {
      if (message.sender_id !== user.id && !message.read && user.id) {
        messagingService?.markMessageAsRead(message.id, user.id);
      }
    });
  }, [messages, messagingService, user?.id]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Please sign in to use messaging</p>
      </div>
    );
  }

  return (
    <Card className={cn('h-96 flex', className)}>
      {/* Conversations List */}
      <div className="w-1/3 border-r">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {conversations.map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationSelect(conversation.id)}
                  className={cn(
                    'w-full p-3 text-left hover:bg-muted/50 flex items-center gap-3 transition-colors',
                    selectedConversation === conversation.id && 'bg-muted'
                  )}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={otherParticipant?.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {otherParticipant?.profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conversation.name || otherParticipant?.profile?.full_name || `User ${otherParticipant?.user_id.slice(-4)}`}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    {conversation.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {replyToMessage && (
                <div className="bg-muted p-3 rounded-lg border-l-4 border-primary">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Replying to:</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyToMessage(null)}
                    >
                      ×
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {replyToMessage.content}
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {message.reply_to_id && (
                    <div className="ml-8 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      Replying to previous message
                    </div>
                  )}
                  <div
                    className={cn(
                      'flex gap-3',
                      message.sender_id === user.id ? 'flex-row-reverse' : 'flex-row'
                    )}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback>
                        {message.sender?.full_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        'flex-1 max-w-[70%] space-y-1',
                        message.sender_id === user.id ? 'text-right' : 'text-left'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {message.sender_id === user.id ? 'You' : message.sender?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                        {message.edited_at && (
                          <p className="text-xs text-muted-foreground">(edited)</p>
                        )}
                      </div>
                      
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditMessage(message.id, editingContent)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingMessageId(null);
                                setEditingContent('');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'p-3 rounded-lg',
                            message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {Array.from(new Set(message.reactions.map(r => r.reaction_type))).map(reactionType => {
                                const count = message.reactions?.filter(r => r.reaction_type === reactionType).length || 0;
                                return (
                                  <Badge
                                    key={reactionType}
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-secondary/80"
                                    onClick={() => handleReaction(message.id, reactionType)}
                                  >
                                    {reactionType} {count}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Message Actions */}
                      {message.sender_id === user.id && editingMessageId !== message.id && (
                        <div className="flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingContent(message.content);
                            }}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => setReplyToMessage(message)}
                          >
                            <Reply className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleReaction(message.id, '👍')}
                          >
                            <Smile className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                  </div>
                  <span>
                    {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing...
                  </span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0"
                >
                  <Smile className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="h-10 w-10 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ChatInterface; 