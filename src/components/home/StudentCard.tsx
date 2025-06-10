"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaComment, FaTrophy } from "react-icons/fa";
import { cn } from "@/lib/utils";
import type { Student } from "@/types/student";

interface StudentCardProps {
  student: Student;
  isSwipeMode: boolean;
  onSwipe?: (direction: 'left' | 'right') => void;
  onOpenChat?: () => void;
  drag?: boolean | "x" | "y";
  style?: React.CSSProperties;
}

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const StudentCard = React.memo<StudentCardProps>(({ 
  student, 
  isSwipeMode,
  onSwipe,
  onOpenChat,
  drag,
  style
}) => {
  return (
    <motion.div
      drag={drag}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={(event, info) => {
        if (drag && onSwipe) {
          if (info.offset.x > 100) onSwipe('right');
          else if (info.offset.x < -100) onSwipe('left');
        }
      }}
      className={cn(
        "bg-card border rounded-xl shadow-lg overflow-hidden",
        "flex flex-col",
        isSwipeMode 
          ? "absolute w-full h-full cursor-grab active:cursor-grabbing" 
          : "hover:shadow-xl transition-shadow duration-200"
      )}
      style={style}
      layout
    >
      <CardHeader className="flex flex-row items-start gap-3 p-4">
        <Avatar className="h-16 w-16 border-2 border-primary/50">
          <AvatarImage src={student.avatar || undefined} alt={student.name} />
          <AvatarFallback className="text-xl bg-muted text-muted-foreground">
            {getInitials(student.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-xl font-bold tracking-tight">{student.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">{student.year}</CardDescription>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {student.subjects.slice(0, 2).map((subject, index) => (
              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                {subject}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-grow">
        <div>
          <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Interests</h4>
          <div className="flex flex-wrap gap-1.5">
            {student.interests.slice(0, 3).map((interest, index) => (
              <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                {interest}
              </Badge>
            ))}
            {student.interests.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                +{student.interests.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {student.achievements && student.achievements.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5 flex items-center">
              <FaTrophy className="mr-1.5 h-3 w-3 text-amber-500" /> Achievements
            </h4>
            <div className="flex flex-wrap gap-2 items-center">
              {student.achievements.slice(0, 3).map((ach) => (
                <Badge 
                  key={ach.id} 
                  variant="default" 
                  className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 text-xs px-2 py-1 flex items-center gap-1 group"
                  title={`${ach.name} - ${ach.description} (Earned: ${new Date(ach.dateEarned).toLocaleDateString()})`}
                >
                  <span className="text-base leading-none">{ach.icon}</span>
                  <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible">
                    {ach.name}
                  </span>
                </Badge>
              ))}
              {student.achievements.length > 3 && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 border-dashed border-muted-foreground/50">
                  +{student.achievements.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {!isSwipeMode && onOpenChat && (
        <CardFooter className="p-4 pt-2 border-t bg-muted/50">
          <Button className="w-full" onClick={onOpenChat} variant="default">
            <FaComment className="mr-2 h-4 w-4" /> View Profile / Chat
          </Button>
        </CardFooter>
      )}
    </motion.div>
  );
});

StudentCard.displayName = 'StudentCard';

export default StudentCard; 