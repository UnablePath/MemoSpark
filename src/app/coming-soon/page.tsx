import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Clock, Mail } from 'lucide-react';
import { MemoSparkLogoSvg } from '@/components/ui/MemoSparkLogoSvg';

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            <span className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Back to MemoSpark
            </span>
          </Link>
          <MemoSparkLogoSvg height={32} className="opacity-50" />
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Clock className="h-4 w-4" />
              Coming Soon
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              PromptU
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              The creative minds behind MemoSpark are building something amazing.
            </p>
          </div>

          {/* Features Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              What We're Building
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    AI-Powered Tools
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Advanced AI solutions for productivity and creativity
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                  <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Stay Updated
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Get notified when we launch new features
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              In the meantime, explore all the amazing features MemoSpark has to offer!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try MemoSpark
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
