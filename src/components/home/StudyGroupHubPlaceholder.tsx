'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaUsers, FaPlusCircle, FaSearch } from 'react-icons/fa';

export const StudyGroupHubPlaceholder = () => {
  return (
    <Card className="mt-6 mb-6 w-full">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <FaUsers className="mr-2 h-5 w-5 text-primary" />
          Study Group Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Find, create, and join study groups to collaborate with your peers. Coming soon!
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" className="flex-1">
            <FaSearch className="mr-2 h-4 w-4" /> Browse Groups
          </Button>
          <Button variant="default" className="flex-1">
            <FaPlusCircle className="mr-2 h-4 w-4" /> Create New Group
          </Button>
        </div>
        {/* Placeholder for list of groups */}
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