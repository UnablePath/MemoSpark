'use client';

import React from 'react';

const CrashoutTab = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <h2 className="text-2xl font-semibold mb-4">Crashout Zone</h2>
      <p className="text-muted-foreground">
        This area is under active development.
      </p>
      <p className="text-muted-foreground mt-2">
        Future features will include a stress-relief writing interface and other emotional support tools.
      </p>
      {/* You can add a placeholder image or icon here if desired */}
      {/* <div className="mt-8">
        <svg className="w-24 h-24 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div> */}
    </div>
  );
};

export default CrashoutTab; 