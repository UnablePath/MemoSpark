import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

// Ultra-secure configuration - NEVER expose these in client code
const SECURE_CONFIG = {
  // Hash of the master password (change this to your actual password hash)
  PASSWORD_HASH: process.env.ANALYTICS_MASTER_PASSWORD_HASH || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Default is empty string hash
  
  // Allowed IP addresses (add your IP here)
  ALLOWED_IPS: process.env.ANALYTICS_ALLOWED_IPS?.split(',') || ['127.0.0.1', '::1'],
  
  // Session timeout (5 minutes)
  SESSION_TIMEOUT: 5 * 60 * 1000,
  
  // Rate limiting
  MAX_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
};

// In-memory store for rate limiting (use Redis in production)
const attemptStore = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

function getClientIP(request: NextRequest): string {
  // Check various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const cfConnecting = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real;
  }
  if (cfConnecting) {
    return cfConnecting;
  }
  
  // For development, allow localhost
  return '127.0.0.1';
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password + process.env.ANALYTICS_SALT || 'memospark-secure-salt').digest('hex');
}

function isIPAllowed(ip: string): boolean {
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1')) {
    return true;
  }
  
  return SECURE_CONFIG.ALLOWED_IPS.includes(ip);
}

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts?: number; lockedUntil?: number } {
  const now = Date.now();
  const attempts = attemptStore.get(ip) || { count: 0, lastAttempt: 0 };
  
  // Check if locked out
  if (attempts.lockedUntil && now < attempts.lockedUntil) {
    return { allowed: false, lockedUntil: attempts.lockedUntil };
  }
  
  // Reset if lockout expired
  if (attempts.lockedUntil && now >= attempts.lockedUntil) {
    attemptStore.delete(ip);
    return { allowed: true, remainingAttempts: SECURE_CONFIG.MAX_ATTEMPTS };
  }
  
  // Reset count if last attempt was more than lockout duration ago
  if (now - attempts.lastAttempt > SECURE_CONFIG.LOCKOUT_DURATION) {
    attemptStore.set(ip, { count: 0, lastAttempt: now });
    return { allowed: true, remainingAttempts: SECURE_CONFIG.MAX_ATTEMPTS };
  }
  
  if (attempts.count >= SECURE_CONFIG.MAX_ATTEMPTS) {
    const lockedUntil = now + SECURE_CONFIG.LOCKOUT_DURATION;
    attemptStore.set(ip, { ...attempts, lockedUntil });
    return { allowed: false, lockedUntil };
  }
  
  return { allowed: true, remainingAttempts: SECURE_CONFIG.MAX_ATTEMPTS - attempts.count };
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const attempts = attemptStore.get(ip) || { count: 0, lastAttempt: 0 };
  attemptStore.set(ip, { count: attempts.count + 1, lastAttempt: now });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    
    // Check IP whitelist
    if (!isIPAllowed(ip)) {
      // Log suspicious access attempt
      console.warn(`🚨 SECURITY ALERT: Unauthorized access attempt from IP: ${ip} at ${new Date().toISOString()}`);
      
      // Return generic error to avoid information disclosure
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      console.warn(`🚨 SECURITY ALERT: Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json({ 
        error: 'Too many attempts', 
        lockedUntil: rateLimitCheck.lockedUntil 
      }, { status: 429 });
    }
    
    const { password } = await request.json();
    
    if (!password) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }
    
    const hashedInput = hashPassword(password);
    
    if (hashedInput !== SECURE_CONFIG.PASSWORD_HASH) {
      recordFailedAttempt(ip);
      console.warn(`🚨 SECURITY ALERT: Invalid password attempt from IP: ${ip} at ${new Date().toISOString()}`);
      return NextResponse.json({ 
        error: 'Invalid credentials',
        remainingAttempts: rateLimitCheck.remainingAttempts ? rateLimitCheck.remainingAttempts - 1 : 0
      }, { status: 401 });
    }
    
    // Generate secure session token
    const sessionToken = createHash('sha256')
      .update(ip + Date.now() + Math.random() + (process.env.ANALYTICS_SESSION_SECRET || 'session-secret'))
      .digest('hex');
    
    // Clear failed attempts on successful login
    attemptStore.delete(ip);
    
    console.log(`✅ SECURE ACCESS: Analytics dashboard accessed from IP: ${ip} at ${new Date().toISOString()}`);
    
    const response = NextResponse.json({ 
      success: true, 
      sessionToken,
      expiresAt: Date.now() + SECURE_CONFIG.SESSION_TIMEOUT
    });
    
    // Set secure HTTP-only cookie
    response.cookies.set('analytics-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SECURE_CONFIG.SESSION_TIMEOUT / 1000,
      path: '/analytics-secure-dashboard-x7k9m2p4'
    });
    
    return response;
    
  } catch (error) {
    console.error('Security verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Verify session endpoint
export async function GET(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    
    if (!isIPAllowed(ip)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const sessionToken = request.cookies.get('analytics-session')?.value;
    const authHeader = request.headers.get('authorization');
    const token = sessionToken || authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'No session token' }, { status: 401 });
    }
    
    // In a real app, you'd verify the token against a database or JWT
    // For now, we'll do a simple check
    return NextResponse.json({ valid: true });
    
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
