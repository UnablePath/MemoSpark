'use client';

import React, { useState } from 'react';

interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
}

export default function TestTaskCreationPage() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testTaskCreation = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-task-creation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
      } else {
        setResult({ success: false, error: data.error || 'Unknown error', data });
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Test Task Creation
          </h1>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              This page tests the POST functionality of the task creation API.
              Make sure you're logged in before testing.
            </p>
            
            <button
              onClick={testTaskCreation}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Testing...' : 'Test Task Creation (POST)'}
            </button>

            {result && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-3">
                  Result: {result.success ? '✅ Success' : '❌ Error'}
                </h2>
                
                <div className="bg-gray-100 rounded-md p-4 overflow-x-auto">
                  <pre className="text-sm">
                    {JSON.stringify(result.data || result.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 