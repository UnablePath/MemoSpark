'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FaRss, FaUsers } from 'react-icons/fa';

export const ActivityFeedPlaceholder = () => {
  return (
    <Card className="mt-6 w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FaRss className="mr-2 h-5 w-5 text-primary" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Stay updated with what your connections are sharing and achieving. This feature is coming soon!
        </p>
        {/* Placeholder content for feed items */}
        <div className="mt-4 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="p-3 bg-muted/50 rounded-md animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 