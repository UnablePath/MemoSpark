'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Zap, TrendingUp, Shield, Clock, Target, Sparkles, Activity } from 'lucide-react';

interface IntelligenceTier {
  name: string;
  level: number;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  userTier: string;
  status: 'active' | 'available' | 'locked';
  performance: {
    responseTime: number;
    confidence: number;
    accuracy: number;
    costEfficiency: number;
  };
}

interface SuperIntelligentDashboardProps {
  userId: string;
  currentTier: string;
}

export const SuperIntelligentDashboard: React.FC<SuperIntelligentDashboardProps> = ({
  userId,
  currentTier
}) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    totalSuggestions: 0,
    averageConfidence: 0,
    learningProgress: 0,
    intelligenceGrowth: 0
  });

  const intelligenceTiers: IntelligenceTier[] = [
    {
      name: 'Super Intelligent ML',
      level: 10,
      description: 'Maximum intelligence with behavioral analysis, mood detection, and predictive modeling',
      features: [
        'Advanced Behavioral Analysis',
        'Real-time Mood Detection',
        'Predictive Study Optimization',
        'Social Learning Insights',
        'Scientific Reasoning',
        'Stress Level Management'
      ],
      icon: <Brain className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      userTier: 'premium_plus',
      status: currentTier === 'premium_plus' ? 'active' : 'available',
      performance: {
        responseTime: 150,
        confidence: 95,
        accuracy: 96,
        costEfficiency: 98
      }
    },
    {
      name: 'Adaptive Learning ML',
      level: 9,
      description: 'Evolving intelligence that learns and adapts to your study patterns over time',
      features: [
        'Personal Pattern Learning',
        'Skill Progression Tracking',
        'Optimal Timing Recognition',
        'Continuous Adaptation',
        'Performance Evolution',
        'Feedback Integration'
      ],
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      userTier: 'premium',
      status: currentTier === 'premium' || currentTier === 'premium_plus' ? 'active' : 'available',
      performance: {
        responseTime: 180,
        confidence: 88,
        accuracy: 89,
        costEfficiency: 95
      }
    },
    {
      name: 'Cost-Optimized AI',
      level: 8,
      description: 'Smart AI with budget protection and intelligent caching for optimal efficiency',
      features: [
        'Budget-Aware Processing',
        'Intelligent Caching',
        'Smart Rate Limiting',
        'Quality Preservation',
        'Cost Protection',
        'External AI Integration'
      ],
      icon: <Shield className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      userTier: 'pro',
      status: currentTier === 'pro' || currentTier === 'premium' || currentTier === 'premium_plus' ? 'active' : 'available',
      performance: {
        responseTime: 220,
        confidence: 82,
        accuracy: 84,
        costEfficiency: 96
      }
    },
    {
      name: 'Local ML',
      level: 6,
      description: 'Zero-cost local intelligence with pattern recognition and optimization algorithms',
      features: [
        'Local Pattern Recognition',
        'Zero-Cost Operation',
        'Instant Availability',
        'Privacy-First Design',
        'Basic Optimization',
        'Reliable Fallback'
      ],
      icon: <Zap className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      userTier: 'basic',
      status: 'active',
      performance: {
        responseTime: 50,
        confidence: 75,
        accuracy: 78,
        costEfficiency: 100
      }
    }
  ];

  const activeTier = intelligenceTiers.find(tier => tier.userTier === currentTier) || intelligenceTiers[3];

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        totalSuggestions: prev.totalSuggestions + Math.floor(Math.random() * 3),
        averageConfidence: Math.min(100, prev.averageConfidence + Math.random() * 2),
        learningProgress: Math.min(100, prev.learningProgress + Math.random() * 1.5),
        intelligenceGrowth: Math.min(100, prev.intelligenceGrowth + Math.random() * 0.8)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Super Intelligent AI System
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Advanced 4-tier intelligence with behavioral analysis & predictive modeling
          </p>
        </div>
      </div>

      {/* Active Tier Display */}
      <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${activeTier.color} text-white`}>
              {activeTier.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {activeTier.name}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Intelligence Level: {activeTier.level}/10
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
            <Activity className="w-4 h-4" />
            <span className="text-sm font-medium">Active</span>
          </div>
        </div>
        
        <p className="text-slate-700 dark:text-slate-300 mb-4">
          {activeTier.description}
        </p>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeTier.performance.responseTime}ms
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Response Time</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeTier.performance.confidence}%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Confidence</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeTier.performance.accuracy}%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Accuracy</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {activeTier.performance.costEfficiency}%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Cost Efficiency</p>
          </div>
        </div>
      </div>

      {/* Intelligence Tiers Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {intelligenceTiers.map((tier, index) => (
          <div
            key={tier.name}
            className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
              tier.status === 'active'
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950'
                : tier.status === 'available'
                ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg bg-gradient-to-r ${tier.color} text-white`}>
                {tier.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {tier.name}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 10 }, (_, i) => (
                      <Sparkles
                        key={i}
                        className={`w-3 h-3 ${
                          i < tier.level
                            ? 'text-yellow-400 fill-current'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {tier.level}/10
                  </span>
                </div>
              </div>
              {tier.status === 'active' && (
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              {tier.description}
            </p>
            
            <div className="space-y-1">
              {tier.features.slice(0, 3).map((feature, featureIndex) => (
                <div key={featureIndex} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {feature}
                </div>
              ))}
              {tier.features.length > 3 && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  +{tier.features.length - 3} more features
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Learning Metrics */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950 dark:to-blue-950 border border-emerald-200 dark:border-emerald-800">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          Real-time Intelligence Metrics
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {realTimeMetrics.totalSuggestions}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Suggestions Generated</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {Math.round(realTimeMetrics.averageConfidence)}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Average Confidence</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {Math.round(realTimeMetrics.learningProgress)}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Learning Progress</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              +{Math.round(realTimeMetrics.intelligenceGrowth)}%
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Intelligence Growth</p>
          </div>
        </div>
      </div>

      {/* Upgrade Prompt for Lower Tiers */}
      {currentTier !== 'premium_plus' && (
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                Unlock Super Intelligent ML
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Get maximum intelligence with behavioral analysis, mood detection, and predictive modeling
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200">
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 