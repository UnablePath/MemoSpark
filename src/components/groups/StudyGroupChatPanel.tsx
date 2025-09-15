'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Send, Users, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudyGroupChat, type ChatMessage, type ChatParticipant } from '@/lib/social/StudyGroupChat';
import { toast } from 'sonner';

interface StudyGroupChatPanelProps {
  conversationId: string;
  groupName: string;
  className?: string;
}

export const StudyGroupChatPanel: React.FC<StudyGroupChatPanelProps> = ({
  conversationId,
  groupName,
  className
}) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    chat,
    isConnected,
    sendMessage,
    loadMessages,
    getParticipants,
    sendTyping,
    markAsRead
  } = useStudyGroupChat(
    conversationId,
    user?.id || '',
    {
      onMessageReceived: (message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
        
        // Show notification if not focused
        if (document.hidden) {
          toast.info(`New message from ${message.sender_name}`, {
            description: message.content.length > 50 
              ? message.content.substring(0, 50) + '...' 
              : message.content
          });
        }
      },
      onParticipantStatusChanged: (participant) => {
        setParticipants(prev => {
          const updated = prev.map(p => 
            p.user_id === participant.user_id 
              ? { ...p, is_online: participant.is_online }
              : p
          );
          
          // Add if not exists
          if (!updated.find(p => p.user_id === participant.user_id)) {
            updated.push(participant);
          }
          
          return updated;
        });
      },
      onTypingChanged: (userId, isTyping) => {
        setTypingUsers(prev => {
          const updated = new Set(prev);
          if (isTyping) {
            updated.add(userId);
          } else {
            updated.delete(userId);
          }
          return updated;
        });
      }
    }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!chat || !isConnected) return;

      try {
        setIsLoading(true);
        const [messagesData, participantsData] = await Promise.all([
          loadMessages?.(50),
          getParticipants?.()
        ]);

        if (messagesData) {
          setMessages(messagesData);
          setTimeout(scrollToBottom, 100);
        }

        if (participantsData) {
          setParticipants(participantsData);
        }
      } catch (error) {
        console.error('Error loading chat data:', error);
        toast.error('Failed to load chat data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [chat, isConnected, loadMessages, getParticipants]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sendMessage) return;

    try {
      const message = await sendMessage(newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      scrollToBottom();
      
      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTyping?.(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle typing indicators
  const handleInputChange = (value: string) => {
    setNewMessage(value);

    if (!sendTyping) return;

    // Send typing indicator
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      sendTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(false);
      }
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getMessageDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const shouldShowDateSeparator = (currentMessage: ChatMessage, previousMessage?: ChatMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();
    
    return currentDate !== previousDate;
  };

  if (!user) {
    return (
      <Card className={cn("h-full", className)}>
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Please sign in to join the chat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{groupName} Chat</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
              {isConnected ? "Connected" : "Connecting..."}
            </Badge>
            <Button variant="ghost" size="sm">
              <Users className="h-4 w-4" />
              <span className="ml-1">{participants.length}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : undefined;
              const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
              const isOwnMessage = message.sender_id === user.id;

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                        {getMessageDate(message.created_at)}
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex gap-3",
                    isOwnMessage && "flex-row-reverse"
                  )}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={message.sender_avatar} />
                      <AvatarFallback>
                        {message.sender_name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={cn(
                      "flex flex-col max-w-[70%]",
                      isOwnMessage && "items-end"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {isOwnMessage ? 'You' : message.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "rounded-lg px-3 py-2 text-sm",
                        isOwnMessage 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicators */}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span>
                  {Array.from(typingUsers).length === 1 
                    ? 'Someone is typing...' 
                    : `${Array.from(typingUsers).length} people are typing...`
                  }
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <div className="p-4 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

