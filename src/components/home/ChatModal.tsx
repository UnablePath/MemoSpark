"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaTimes, FaPaperPlane } from "react-icons/fa";
import type { Student, Message } from "@/types/student";

interface ChatModalProps {
  student: Student;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const ChatModal = React.memo<ChatModalProps>(({ 
  student, 
  messages, 
  onSendMessage, 
  onClose 
}) => {
  const [chatMessage, setChatMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatModalRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
    setTimeout(() => chatInputRef.current?.focus(), 100);

    return () => {
      setTimeout(() => lastFocusedElementRef.current?.focus(), 0);
    };
  }, []);

  // Focus trapping
  useEffect(() => {
    if (!chatModalRef.current) return;

    const focusableElements = Array.from(
      chatModalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    onSendMessage(chatMessage);
    setChatMessage("");
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <motion.div
      ref={chatModalRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 260, damping: 25 }}
      className="fixed inset-0 md:inset-auto md:bottom-0 md:right-0 md:m-4 md:max-w-md w-full h-full md:h-[70vh] md:max-h-[500px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`chat-with-${student.id}-title`}
    >
      <Card className="w-full max-w-lg h-[70vh] flex flex-col shadow-xl bg-card">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage 
                src={student.avatar || undefined} 
                alt={`${student.name}'s avatar`} 
              />
              <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
            </Avatar>
            <CardTitle id={`chat-with-${student.id}-title`}>
              Chat with {student.name}
            </CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose} 
            aria-label={`Close chat with ${student.name}`}
          >
            <FaTimes aria-hidden="true" />
          </Button>
        </CardHeader>
        
        <ScrollArea className="flex-grow p-4">
          <ul className="space-y-3" aria-live="polite">
            {messages.map((msg, index) => (
              <li key={index} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`p-2 rounded-lg max-w-[70%] ${
                    msg.sent 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.text}
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
        
        <CardFooter className="p-4 border-t">
          <form className="flex w-full gap-2" onSubmit={handleSendMessage}>
            <Input 
              ref={chatInputRef}
              type="text" 
              placeholder="Type a message..." 
              value={chatMessage} 
              onChange={(e) => setChatMessage(e.target.value)} 
              aria-label={`Message to ${student.name}`}
              className="flex-grow"
            />
            <Button type="submit" size="icon" aria-label="Send message">
              <FaPaperPlane aria-hidden="true" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </motion.div>
  );
});

ChatModal.displayName = 'ChatModal';

export default ChatModal; 