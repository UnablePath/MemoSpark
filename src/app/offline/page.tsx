'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  useEffect(() => {
    document.title = 'Offline - MemoSpark'
  }, [])

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border/70 bg-card p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tight">You are offline</h1>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-muted/40">
            <WifiOff className="h-5 w-5 text-primary" aria-hidden />
          </div>
        </div>

        <p className="max-w-[70ch] text-sm leading-relaxed text-muted-foreground md:text-base">
          MemoSpark needs an internet connection to sync your timetable, streaks, and social updates.
          You can still review recently loaded content while your connection returns.
        </p>

        <div className="mt-6 rounded-2xl border border-border/70 bg-muted/30 p-4">
          <h2 className="text-sm font-semibold text-foreground">Available while offline</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Review cached tasks and previous progress snapshots</li>
            <li>Open stress-relief and previously loaded pages</li>
            <li>Create notes that can sync once connectivity returns</li>
          </ul>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            onClick={() => window.location.reload()}
            className="h-11 w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry connection
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to dashboard
            </Link>
          </Button>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            Status: <span className="font-medium text-foreground">offline</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            If this persists, check mobile data or Wi-Fi and try again.
          </p>
        </div>

        <div className="mt-8">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="h-11 w-full"
          >
            Go back
          </Button>
        </div>
      </div>
    </main>
  )
} 