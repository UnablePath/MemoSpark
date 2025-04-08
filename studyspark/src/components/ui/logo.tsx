import type React from "react";
import { cn } from "@/lib/utils";
import KoalaMascot from "./koala-mascot";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({
  size = "md",
  showText = true,
  className,
  ...props
}: LogoProps) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const koalaSizes = {
    sm: 24,
    md: 40,
    lg: 56,
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-bold",
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
          "rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-primary",
          sizeClasses[size]
        )}
      >
        <KoalaMascot size={koalaSizes[size]} />
      </div>
      {showText && (
        <span className={cn("mt-1 font-bold", textSizes[size])}>StudySpark</span>
      )}
    </div>
  );
};

export default Logo;
