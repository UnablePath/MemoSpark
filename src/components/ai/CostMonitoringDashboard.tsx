'use client';

import React, { useState, useEffect } from 'react';
import { costOptimizedAI } from '@/lib/ai/CostOptimizedAIService';

interface CostStats {
  dailyUsage: number;
  remainingCalls: number;
  cacheHitRate: number;
  estimatedMonthlyCost: number;
}

export const CostMonitoringDashboard: React.FC = () => {
  const [stats, setStats] = useState<CostStats>({
    dailyUsage: 0,
    remainingCalls: 50,
    cacheHitRate: 0,
    estimatedMonthlyCost: 0.30
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchStats = () => {
      try {
        const currentStats = costOptimizedAI.getCostStats();
        setStats(currentStats);
      } catch (error) {
        console.error('Failed to fetch cost stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const usagePercentage = Math.round((stats.dailyUsage / 50) * 100);
  const budgetHealth = usagePercentage < 50 ? 'healthy' : usagePercentage < 80 ? 'warning' : 'critical';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            budgetHealth === 'healthy' ? 'bg-green-500' : 
            budgetHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <h3 className="text-sm font-medium text-gray-900">
            AI Cost Monitor
          </h3>
          <span className="text-xs text-gray-500">
            ${stats.estimatedMonthlyCost.toFixed(2)}/month
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-xs text-gray-500">Today</div>
            <div className="text-sm font-medium">
              {stats.dailyUsage}/50 calls
            </div>
          </div>
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Usage Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Daily API Usage</span>
              <span>{usagePercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  budgetHealth === 'healthy' ? 'bg-green-500' : 
                  budgetHealth === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Cost Optimization Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">
                {stats.cacheHitRate}%
              </div>
              <div className="text-xs text-gray-600">Cache Hit Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                💰 Saves ${(stats.cacheHitRate * 0.01).toFixed(2)}/day
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-blue-600">
                {stats.remainingCalls}
              </div>
              <div className="text-xs text-gray-600">Calls Left</div>
              <div className="text-xs text-gray-500 mt-1">
                Resets at midnight
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-lg font-bold text-purple-600">
                $0.10
              </div>
              <div className="text-xs text-gray-600">Total Budget</div>
              <div className="text-xs text-gray-500 mt-1">
                HuggingFace credits
              </div>
            </div>
          </div>

          {/* Cost Savings Tips */}
          <div className="bg-blue-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Cost Optimization Active</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Intelligent caching saves ~70% on repeated requests</li>
              <li>• Fallback AI provides premium-quality suggestions locally</li>
              <li>• Smart rate limiting protects your budget</li>
              <li>• Cache expires in 48 hours for fresh results</li>
            </ul>
          </div>

          {/* Budget Alerts */}
          {budgetHealth === 'warning' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="text-yellow-400 mr-2">⚠️</div>
                <div>
                  <div className="text-sm font-medium text-yellow-800">Budget Warning</div>
                  <div className="text-xs text-yellow-700 mt-1">
                    You've used {usagePercentage}% of today's budget. System will automatically switch to local AI soon.
                  </div>
                </div>
              </div>
            </div>
          )}

          {budgetHealth === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="text-red-400 mr-2">🚨</div>
                <div>
                  <div className="text-sm font-medium text-red-800">Budget Protection Active</div>
                  <div className="text-xs text-red-700 mt-1">
                    Using local AI to protect your budget. Premium features still available with cached results!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CostMonitoringDashboard; 