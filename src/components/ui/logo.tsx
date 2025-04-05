import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export const Logo = ({
  size = "md",
  className,
  ...props
}: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "rounded-full bg-white flex items-center justify-center shadow-lg",
          sizeClasses[size]
        )}
      >
        <div className="bg-primary rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 w-[85%] h-[85%]">
          <span className="text-white font-bold text-sm sm:text-lg">
            S
          </span>
        </div>
      </div>
      <span className="mt-1 font-bold text-xs sm:text-sm">StudySpark</span>
    </div>
  );
};

export default Logo;
