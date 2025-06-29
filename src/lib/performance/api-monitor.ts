// API Performance Monitor
interface APICallData {
  endpoint: string;
  timestamp: number;
  method: string;
  cached: boolean;
  responseTime?: number;
  status?: number;
}

class APIMonitor {
  private calls: APICallData[] = [];
  private startTime: number = Date.now();
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = window.fetch;
    this.setupFetchInterceptor();
  }

  private setupFetchInterceptor() {
    window.fetch = async (...args) => {
      const [url, options] = args;
      const startTime = Date.now();
      
      // Extract endpoint from URL
      const endpoint = typeof url === 'string' ? url : url.toString();
      const method = options?.method || 'GET';
      
      try {
        const response = await this.originalFetch(...args);
        const responseTime = Date.now() - startTime;
        
        // Check if this was served from cache (React Query cache)
        const cached = response.headers.get('x-cache') === 'HIT' || responseTime < 10;
        
        this.logCall({
          endpoint,
          timestamp: Date.now(),
          method,
          cached,
          responseTime,
          status: response.status
        });
        
        return response;
      } catch (error) {
        this.logCall({
          endpoint,
          timestamp: Date.now(),
          method,
          cached: false,
          responseTime: Date.now() - startTime,
          status: 0
        });
        throw error;
      }
    };
  }

  private logCall(data: APICallData) {
    // Only track our API endpoints
    if (data.endpoint.includes('/api/achievements') || 
        data.endpoint.includes('/api/gamification') ||
        data.endpoint.includes('/api/tasks')) {
      this.calls.push(data);
    }
  }

  getStats() {
    const now = Date.now();
    const timeWindow = 60000; // Last 60 seconds
    const recentCalls = this.calls.filter(call => now - call.timestamp < timeWindow);
    
    const achievementCalls = recentCalls.filter(call => 
      call.endpoint.includes('/api/achievements')
    );
    
    const gamificationCalls = recentCalls.filter(call => 
      call.endpoint.includes('/api/gamification')
    );
    
    const cachedCalls = recentCalls.filter(call => call.cached);
    const cacheHitRate = recentCalls.length > 0 ? 
      (cachedCalls.length / recentCalls.length) * 100 : 0;
    
    const avgResponseTime = recentCalls.length > 0 ?
      recentCalls.reduce((sum, call) => sum + (call.responseTime || 0), 0) / recentCalls.length :
      0;
    
    return {
      totalCalls: recentCalls.length,
      achievementCalls: achievementCalls.length,
      gamificationCalls: gamificationCalls.length,
      cacheHitRate: Math.round(cacheHitRate),
      avgResponseTime: Math.round(avgResponseTime),
      callsPerMinute: recentCalls.length,
      uptime: Math.round((now - this.startTime) / 1000)
    };
  }

  getDetailedLog() {
    return this.calls.slice(-50); // Last 50 calls
  }

  reset() {
    this.calls = [];
    this.startTime = Date.now();
  }

  destroy() {
    window.fetch = this.originalFetch;
  }
}

// Singleton instance
let monitor: APIMonitor | null = null;

export const getAPIMonitor = () => {
  if (!monitor && typeof window !== 'undefined') {
    monitor = new APIMonitor();
  }
  return monitor;
};

export const destroyAPIMonitor = () => {
  if (monitor) {
    monitor.destroy();
    monitor = null;
  }
};

export type { APICallData }; 