'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Zap,
  Target,
  Award,
  Coins
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers7d: number;
    activeUsers1d: number;
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;
    totalAchievements: number;
    achievementsLast7d: number;
    totalCoinsEarned: number;
    totalPointsEarned: number;
    premiumUsers: number;
    freeUsers: number;
    conversionRate: number;
    monthlyRevenue: number;
  };
  userEngagement: Array<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastActive: string;
    totalTasks: number;
    completedTasks: number;
    totalAchievements: number;
    totalPoints: number;
    totalCoins: number;
    currentStreak: number;
    subscription: string;
  }>;
  recentActivity: {
    tasksLast7d: number;
    achievementsLast7d: number;
    newUsers7d: number;
    conversionsLast7d: number;
  };
  conversionFunnel: {
    signups: number;
    onboardingCompleted: number;
    firstTaskCreated: number;
    subscribed: number;
  };
  systemHealth: {
    databaseConnected: boolean;
    totalQueries: string;
    averageResponseTime: string;
    uptime: string;
  };
}

export default function SecureAnalyticsDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<number | null>(null);

  // Security monitoring
  useEffect(() => {
    // Check for session expiry
    const interval = setInterval(() => {
      if (sessionExpiry && Date.now() > sessionExpiry) {
        handleLogout();
        toast.error('Session expired for security');
      }
      
      // Check lock expiry
      if (lockExpiry && Date.now() > lockExpiry) {
        setIsLocked(false);
        setLockExpiry(null);
        setRemainingAttempts(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionExpiry, lockExpiry]);

  // Prevent screenshots and dev tools (basic protection)
  useEffect(() => {
    const preventScreenshot = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
          (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        toast.error('Developer tools disabled for security');
      }
      
      // Disable Ctrl+S (save page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        toast.error('Page saving disabled for security');
      }
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      toast.error('Right-click disabled for security');
    };

    document.addEventListener('keydown', preventScreenshot);
    document.addEventListener('contextmenu', preventRightClick);

    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('keydown', preventScreenshot);
      document.removeEventListener('contextmenu', preventRightClick);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  const handleLogin = async () => {
    if (isLocked) {
      const remainingTime = Math.ceil((lockExpiry! - Date.now()) / 1000 / 60);
      toast.error(`Account locked. Try again in ${remainingTime} minutes.`);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/secure/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setSessionExpiry(data.expiresAt);
        setPassword('');
        setRemainingAttempts(null);
        toast.success('🔐 Secure access granted');
        await fetchAnalytics();
      } else {
        if (response.status === 429) {
          setIsLocked(true);
          setLockExpiry(data.lockedUntil);
          const remainingTime = Math.ceil((data.lockedUntil - Date.now()) / 1000 / 60);
          toast.error(`Too many attempts. Locked for ${remainingTime} minutes.`);
        } else {
          setRemainingAttempts(data.remainingAttempts);
          toast.error(`❌ ${data.error}${data.remainingAttempts !== undefined ? ` (${data.remainingAttempts} attempts left)` : ''}`);
        }
      }
    } catch (error) {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/secure/analytics');
      const data = await response.json();

      if (response.ok) {
        setAnalyticsData(data.data);
      } else {
        toast.error('Failed to fetch analytics data');
      }
    } catch (error) {
      toast.error('Error loading analytics');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAnalyticsData(null);
    setSessionExpiry(null);
    toast.info('Logged out securely');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-red-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-400 text-xl">🔒 SECURE ACCESS REQUIRED</CardTitle>
            <p className="text-gray-400 text-sm">
              Ultra-secure analytics dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLocked && lockExpiry && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-sm">
                  Account locked for security
                </p>
                <p className="text-gray-400 text-xs">
                  Unlocks in: {Math.ceil((lockExpiry - Date.now()) / 1000 / 60)} minutes
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  disabled={isLoading || isLocked}
                  className="bg-gray-800 border-gray-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {remainingAttempts !== null && (
                <p className="text-yellow-400 text-xs text-center">
                  ⚠️ {remainingAttempts} attempts remaining
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleLogin} 
              disabled={isLoading || !password || isLocked}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Authenticate
                </>
              )}
            </Button>
            
            <div className="text-center text-xs text-gray-500">
              <p>🛡️ IP-restricted • Rate-limited • Encrypted</p>
              <p>⚡ Session expires in 5 minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p>Loading secure analytics...</p>
        </div>
      </div>
    );
  }

  const timeUntilExpiry = sessionExpiry ? Math.ceil((sessionExpiry - Date.now()) / 1000 / 60) : 0;

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Security Header */}
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-red-400" />
            <div>
              <h1 className="text-xl font-bold text-red-400">🔒 SECURE ANALYTICS DASHBOARD</h1>
              <p className="text-gray-400 text-sm">Ultra-secure • IP-restricted • Encrypted</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-yellow-400">Session expires in: {timeUntilExpiry}m</p>
              <p className="text-gray-400">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold text-white">{analyticsData.overview.totalUsers.toLocaleString()}</p>
                <p className="text-green-400 text-xs">
                  {analyticsData.overview.activeUsers7d} active (7d)
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Revenue (30d)</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(analyticsData.overview.monthlyRevenue)}
                </p>
                <p className="text-gray-400 text-xs">
                  {analyticsData.overview.premiumUsers} premium users
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatPercentage(analyticsData.overview.conversionRate)}
                </p>
                <p className="text-gray-400 text-xs">
                  Free to Premium
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Task Completion</p>
                <p className="text-2xl font-bold text-orange-400">
                  {formatPercentage(analyticsData.overview.taskCompletionRate)}
                </p>
                <p className="text-gray-400 text-xs">
                  {analyticsData.overview.completedTasks.toLocaleString()} / {analyticsData.overview.totalTasks.toLocaleString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gamification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Points Earned</p>
                <p className="text-xl font-bold text-yellow-400">
                  {analyticsData.overview.totalPointsEarned.toLocaleString()}
                </p>
              </div>
              <Zap className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Coins Earned</p>
                <p className="text-xl font-bold text-amber-400">
                  {analyticsData.overview.totalCoinsEarned.toLocaleString()}
                </p>
              </div>
              <Coins className="h-6 w-6 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Achievements</p>
                <p className="text-xl font-bold text-pink-400">
                  {analyticsData.overview.totalAchievements.toLocaleString()}
                </p>
                <p className="text-green-400 text-xs">
                  +{analyticsData.overview.achievementsLast7d} (7d)
                </p>
              </div>
              <Award className="h-6 w-6 text-pink-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {analyticsData.conversionFunnel.signups.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Signups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {analyticsData.conversionFunnel.onboardingCompleted.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Onboarding</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {analyticsData.conversionFunnel.firstTaskCreated.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">First Task</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {analyticsData.conversionFunnel.subscribed.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">Subscribed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="bg-gray-900 border-gray-800 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Top Engaged Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analyticsData.userEngagement.slice(0, 10).map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-gray-400">#{index + 1}</div>
                  <div>
                    <div className="font-medium text-white">{user.name || 'Anonymous'}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">{user.totalPoints}</div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-bold">{user.totalCoins}</div>
                    <div className="text-xs text-gray-400">coins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{user.completedTasks}</div>
                    <div className="text-xs text-gray-400">tasks</div>
                  </div>
                  <Badge variant={user.subscription === 'free' ? 'secondary' : 'default'}>
                    {user.subscription}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              {analyticsData.systemHealth.databaseConnected ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              <span className="text-sm">Uptime: {analyticsData.systemHealth.uptime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-400" />
              <span className="text-sm">Response: {analyticsData.systemHealth.averageResponseTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              <span className="text-sm">Queries: {analyticsData.systemHealth.totalQueries}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Footer */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <p>🔒 This dashboard is ultra-secure and monitored. All access is logged.</p>
        <p>⚠️ Do not share credentials or leave unattended.</p>
      </div>
    </div>
  );
}
