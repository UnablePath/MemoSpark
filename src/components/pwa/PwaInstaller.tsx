'use client';

import { useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

export function PwaInstaller() {
  const { canInstall, install } = usePWA();

  useEffect(() => {
    const testManifest = async () => {
      try {
        const manifestUrl = '/manifest.webmanifest'
        await fetch(manifestUrl)
      } catch (error) {
        console.error('Manifest test error:', error)
      }
    }
    
    // Run this check when the component mounts
    testManifest();
  }, [])
  
  if (!canInstall) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
        <button
            onClick={install}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
            Install App
        </button>
    </div>
  );
} 