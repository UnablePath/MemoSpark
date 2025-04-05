"use client";

import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WidgetProps extends React.HTMLAttributes<HTMLDivElement> {
  task?: {
    title: string;
    dueDate: string;
    priority: "low" | "medium" | "high";
  };
}

const Widget = ({ task, className, ...props }: WidgetProps) => {
  const priorityColors = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "rounded-full bg-white shadow-lg p-1 max-w-[120px] aspect-square flex flex-col items-center justify-center border-4 border-primary overflow-hidden relative",
        className
      )}
      {...props}
    >
      {task ? (
        <>
          <div className="absolute top-0 left-0 w-full h-2 bg-secondary" />
          <div className="text-center px-2">
            <div className="text-xs font-semibold line-clamp-2">{task.title}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(task.dueDate), "MMM d")}
            </div>
            <div className={`h-1.5 w-1.5 rounded-full mt-1 mx-auto ${priorityColors[task.priority]}`} />
          </div>
        </>
      ) : (
        <div className="text-center px-2">
          <div className="text-xs font-semibold">No urgent tasks</div>
          <div className="text-[10px] text-muted-foreground mt-1">All caught up!</div>
        </div>
      )}
      <div className="absolute bottom-2 text-[8px] font-medium">StudySpark</div>
    </motion.div>
  );
};

export default Widget;
