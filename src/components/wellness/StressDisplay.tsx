'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Zap,
  X,
  Play,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { 
  stressMeter, 
  type StressReading, 
  type PredictiveInsight, 
  type WellnessRecommendation 
} from '@/lib/wellness/StressMeter';

interface StressDisplayProps {
  showInsights?: boolean;
  showRecommendations?: boolean;
  allowInput?: boolean;
  onInterventionStart?: (type: string) => void;
}

export const StressDisplay: React.FC<StressDisplayProps> = ({
  showInsights = true,
  showRecommendations = true,
  allowInput = true,
  onInterventionStart
}) => {
  const [currentStress, setCurrentStress] = useState<number>(0);
  const [recentReadings, setRecentReadings] = useState<StressReading[]>([]);
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [recommendations, setRecommendations] = useState<WellnessRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showStressInput, setShowStressInput] = useState(false);
  const [inputStressLevel, setInputStressLevel] = useState([50]);
  const [stressFactors, setStressFactors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadStressData();
  }, []);

  const loadStressData = async () => {
    setIsLoading(true);
    try {
      const [currentLevel, readings, predictiveInsights, wellnessRecs] = await Promise.all([
        stressMeter.getCurrentStressLevel(),
        stressMeter.getRecentStressReadings(10),
        showInsights ? stressMeter.generatePredictiveInsights() : [],
        showRecommendations ? stressMeter.getWellnessRecommendations() : []
      ]);

      setCurrentStress(currentLevel || 0);
      setRecentReadings(readings);
      setInsights(predictiveInsights);
      setRecommendations(wellnessRecs);
    } catch (error) {
      console.error('Error loading stress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStressSubmit = async () => {
    const result = await stressMeter.recordStressLevel(
      inputStressLevel[0],
      stressFactors,
      {},
      notes
    );

    if (result) {
      setCurrentStress(inputStressLevel[0]);
      setShowStressInput(false);
      setStressFactors([]);
      setNotes('');
      await loadStressData(); // Refresh data
    }
  };

  const getStressColor = (level: number): string => {
    if (level <= 30) return 'text-green-600';
    if (level <= 50) return 'text-yellow-600';
    if (level <= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStressBackground = (level: number): string => {
    if (level <= 30) return 'from-green-500 to-green-600';
    if (level <= 50) return 'from-yellow-500 to-yellow-600';
    if (level <= 70) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getStressLabel = (level: number): string => {
    if (level <= 30) return 'Low Stress';
    if (level <= 50) return 'Moderate Stress';
    if (level <= 70) return 'High Stress';
    return 'Very High Stress';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'medium': return <BarChart3 className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const handleInterventionClick = (type: string) => {
    if (onInterventionStart) {
      onInterventionStart(type);
    }
  };

  const dismissRecommendation = async (recommendationId: string) => {
    const success = await stressMeter.dismissRecommendation(recommendationId);
    if (success) {
      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
    }
  };

  const commonStressFactors = [
    'Deadlines', 'Exams', 'Workload', 'Social Pressure', 'Financial Stress',
    'Family Issues', 'Health Concerns', 'Sleep Deprivation', 'Time Management',
    'Technology', 'Perfectionism', 'Uncertainty'
  ];

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Stress Meter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Main Stress Meter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Stress Meter
            </div>
            {allowInput && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowStressInput(!showStressInput)}
              >
                Update Stress Level
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Stress Level Display */}
          <div className="text-center space-y-4">
            <motion.div
              className="relative w-32 h-32 mx-auto"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-gray-200"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="url(#stressGradient)"
                  strokeWidth="10"
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                  animate={{ 
                    strokeDashoffset: 2 * Math.PI * 45 * (1 - currentStress / 100) 
                  }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
                <defs>
                  <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className={getStressBackground(currentStress).split(' ')[0].replace('from-', 'stop-')} />
                    <stop offset="100%" className={getStressBackground(currentStress).split(' ')[1].replace('to-', 'stop-')} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getStressColor(currentStress)}`}>
                    {currentStress}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStressLabel(currentStress)}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Trend */}
            {recentReadings.length >= 2 && (
              <div className="flex items-center justify-center gap-2">
                {recentReadings[0].stressLevel > recentReadings[1].stressLevel ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm text-muted-foreground">
                  {Math.abs(recentReadings[0].stressLevel - recentReadings[1].stressLevel)} point change from last reading
                </span>
              </div>
            )}
          </div>

          {/* Stress Input */}
          <AnimatePresence>
            {showStressInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border rounded-lg p-4 space-y-4"
              >
                <h3 className="font-semibold">Record Current Stress Level</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stress Level: {inputStressLevel[0]}</label>
                  <Slider
                    value={inputStressLevel}
                    onValueChange={setInputStressLevel}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Stress Factors (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {commonStressFactors.map((factor) => (
                      <Button
                        key={factor}
                        variant={stressFactors.includes(factor) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setStressFactors(prev => 
                            prev.includes(factor) 
                              ? prev.filter(f => f !== factor)
                              : [...prev, factor]
                          );
                        }}
                      >
                        {factor}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    rows={2}
                    placeholder="How are you feeling? What's causing stress?"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleStressSubmit}>
                    Record Stress Level
                  </Button>
                  <Button variant="outline" onClick={() => setShowStressInput(false)}>
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      {showInsights && insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Stress Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(insight.severity)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                      {insight.actionable && insight.suggestedActions.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-2">Suggested Actions:</p>
                          <div className="flex flex-wrap gap-1">
                            {insight.suggestedActions.map((action, actionIndex) => (
                              <Badge key={actionIndex} variant="secondary" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wellness Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Wellness Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((recommendation) => (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{recommendation.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {recommendation.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Priority {recommendation.priority}
                    </Badge>
                    {recommendation.recommendationType === 'immediate_intervention' && (
                      <Button
                        size="sm"
                        onClick={() => handleInterventionClick('ragdoll_game')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Start
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissRecommendation(recommendation.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings */}
      {recentReadings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentReadings.slice(0, 5).map((reading) => (
                <div
                  key={reading.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getStressBackground(reading.stressLevel)}`} />
                    <span className="text-sm">
                      Stress Level: {reading.stressLevel}
                    </span>
                    {reading.stressFactors.length > 0 && (
                      <div className="flex gap-1">
                        {reading.stressFactors.slice(0, 2).map((factor, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                        {reading.stressFactors.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{reading.stressFactors.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(reading.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StressDisplay; 