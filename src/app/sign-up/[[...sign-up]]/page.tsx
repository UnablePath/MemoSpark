import { SignUp } from "@clerk/nextjs";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";
import { memoSparkClerkAppearance } from "@/lib/clerk-appearance";

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-[hsl(var(--background))] to-[hsl(var(--background))] p-4">
      <div className="w-full max-w-md bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] rounded-xl border border-[hsl(var(--border))] shadow-xl">
        <div className="flex flex-col items-center p-6">
          <div className="mx-auto mb-6 text-[hsl(var(--primary))]">
            <MemoSparkLogoSvg height={50} />
          </div>
          <SignUp 
            path="/sign-up" 
            appearance={memoSparkClerkAppearance} 
          />
        </div>
      </div>
    </div>
  );
} 