'use client'

import React from 'react'
import { usePWA } from '@/hooks/usePWA'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowUpToLine } from 'lucide-react'

export const UpdateAvailable: React.FC = () => {
  const { hasUpdate, update } = usePWA()

  if (!hasUpdate) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="max-w-sm bg-background/90 backdrop-blur-sm border-border shadow-lg animate-in fade-in slide-in-from-bottom-5">
        <CardHeader>
          <CardTitle>Update Available</CardTitle>
          <CardDescription>A new version of MemoSpark is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={update} className="w-full">
            <ArrowUpToLine className="mr-2 h-4 w-4" />
            Update Now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 