import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Rss } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-5 w-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>
          Stay updated with what your connections are sharing and achieving. This feature is coming soon!
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Placeholder for future activity feed content */}
      </CardContent>
    </Card>
  );
}; 