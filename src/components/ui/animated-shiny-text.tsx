import { cn } from "@/lib/utils";
import React, { CSSProperties } from "react";

interface AnimatedShinyTextProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedShinyText = ({
  children,
  className,
}: AnimatedShinyTextProps) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        className,
      )}
    >
      {children}
      <div className="absolute inset-0 -z-10">
        <div
          className={cn(
            "absolute inset-[-1000%] animate-shimmer",
            "bg-[linear-gradient(110deg,transparent,45%,rgba(255,255,255,0.7),55%,transparent)]",
            "bg-[length:200%_100%]",
          )}
        />
      </div>
    </div>
  );
};

export default AnimatedShinyText; 