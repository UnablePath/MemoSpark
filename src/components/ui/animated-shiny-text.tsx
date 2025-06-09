import { cn } from "@/lib/utils";

const AnimatedShinyText = ({
  children,
  className,
  shimmerWidth = 100,
}: {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
}) => {
  return (
    <p
      style={
        {
          "--shimmer-width": `${shimmerWidth}px`,
        } as React.CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-neutral-600/50 dark:text-neutral-400/50 ",

        // Shimmer effect
        "animate-shimmer bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shimmer-width)_100%] [transition:background-position_1s_cubic-bezier(.6,.6,0,1)_infinite]",

        // Light mode
        "bg-gradient-to-r from-neutral-900 via-neutral-900/50 to-neutral-900",

        // Dark mode
        "dark:bg-gradient-to-r dark:from-neutral-100 dark:via-neutral-100/50 dark:to-neutral-100",

        className,
      )}
    >
      {children}
    </p>
  );
};

export default AnimatedShinyText; 