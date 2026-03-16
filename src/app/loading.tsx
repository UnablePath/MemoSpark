import { SparkLoader } from '@/components/ui/SparkLoader';

export default function Loading() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-[#111] text-white">
      <SparkLoader label="Preparing your MemoSpark workspace..." />
    </main>
  );
}
