"use client";

// Import both router methods to ensure we have a fallback
import { useRouter as useNextRouter } from 'next/navigation';

// Re-export Next.js router for backward compatibility
export const useRouter = useNextRouter;

export default useRouter;
