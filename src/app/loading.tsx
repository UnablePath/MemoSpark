import { SparkLoader } from '@/components/ui/SparkLoader';

export default function Loading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background text-foreground px-4">
      <div className="w-full max-w-md">
        <SparkLoader label="Preparing your MemoSpark workspace..." />
      </div>
    </main>
  );
}
