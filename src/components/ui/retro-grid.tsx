import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const retroGridVariants = cva(
  "absolute h-full w-full overflow-hidden [perspective:200px]",
  {
    variants: {
      variant: {
        "top-left":
          "[perspective-origin:top_left] rtl:[perspective-origin:top_right]",
        "top-right":
          "[perspective-origin:top_right] rtl:[perspective-origin:top_left]",
        "bottom-left":
          "[perspective-origin:bottom_left] rtl:[perspective-origin:bottom_right]",
        "bottom-right":
          "[perspective-origin:bottom_right] rtl:[perspective-origin:bottom_left]",
      },
    },
    defaultVariants: {
      variant: "bottom-left",
    },
  },
);

export interface RetroGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof retroGridVariants> {}

const RetroGrid = React.forwardRef<HTMLDivElement, RetroGridProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(retroGridVariants({ variant }), className)}
        {...props}
      >
        <div className="absolute inset-0 [transform:rotateX(30deg)]">
          <div
            className={cn(
              "animate-grid",

              "[background-image:linear-gradient(to_right,rgba(120,120,120,0.2)_1px,transparent_0),linear-gradient(to_bottom,rgba(120,120,120,0.2)_1px,transparent_0)]",
              "[background-size:40px_40px] [mask-image:radial-gradient(ellipse_50%_60%_at_50%_0%,#000_70%,transparent_100%)]",
            )}
          ></div>
        </div>
      </div>
    );
  },
);

RetroGrid.displayName = "RetroGrid";

export default RetroGrid; 