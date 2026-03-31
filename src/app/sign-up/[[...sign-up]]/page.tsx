import { SignUp } from "@clerk/nextjs";
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";

export default function Page() {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-br from-[hsl(var(--primary)/0.1)] via-[hsl(var(--background))] to-[hsl(var(--background))] px-3 py-4 dark:bg-none dark:bg-[#0c0e13] sm:p-4">
      <div className="w-full min-w-0 max-w-md overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-xl">
        <div className="flex min-w-0 flex-col items-center p-4 sm:p-6">
          <div className="mx-auto mb-6 text-[hsl(var(--primary))]">
            <MemoSparkLogoSvg height={50} />
          </div>
          <SignUp path="/sign-up" />
        </div>
      </div>
    </div>
  );
} 