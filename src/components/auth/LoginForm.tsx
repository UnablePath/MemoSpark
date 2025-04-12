"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from "@/lib/hooks/use-router";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner, Google as GoogleIcon } from '@/components/ui/icons';
import { toast } from 'sonner';

// Form validation schema
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        toast.error('Authentication failed', {
          description: error.message,
        });
        return;
      }

      // Redirect the user after successful login
      console.log('Login successful, redirecting to:', from);
      
      // Use window.location.href as fallback if router push doesn't work
      try {
        router.push(from);
      } catch (err) {
        console.error('Router push failed, using fallback navigation', err);
        window.location.href = from;
      }
      
      toast.success('Logged in successfully');
    } catch (error) {
      toast.error('Something went wrong', {
        description: 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      console.log('Initiating Google sign-in from login form');
      await signInWithGoogle();
      // A note that this redirect happens via Supabase's OAuth flow
      // You'll be redirected to the Google authentication page, then back to your auth callback
    } catch (error) {
      console.error('Google sign-in exception:', error);
      toast.error('Google sign-in failed', {
        description: 'Please try again later',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button variant="link" className="px-0 h-auto" asChild>
                <a href="/forgot-password" className="text-sm underline">
                  Forgot password?
                </a>
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <Button disabled={isLoading} type="submit">
            {isLoading && (
              <Spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Sign In
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <Button
        variant="outline"
        type="button"
        disabled={isGoogleLoading}
        onClick={handleGoogleSignIn}
      >
        {isGoogleLoading ? (
          <Spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        Google
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Button 
          variant="link" 
          className="p-0 h-auto" 
          onClick={() => {
            try {
              router.push('/signup');
            } catch (err) {
              console.error('Router navigation failed, using fallback', err);
              window.location.href = '/signup';
            }
          }}
        >
          <span className="underline">Sign up</span>
        </Button>
      </p>
    </div>
  );
}
