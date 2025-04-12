"use client";

import { useState } from 'react';
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
const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  yearOfStudy: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      yearOfStudy: '',
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);

    try {
      const { error, user } = await signUp(data.email, data.password, {
        full_name: data.name,
        year_of_study: data.yearOfStudy || 'Not specified',
        subjects: [],
        interests: [],
      });

      if (error) {
        toast.error('Signup failed', {
          description: error.message,
        });
        return;
      }

      // Check if email confirmation is required
      if (!user) {
        toast.success('Check your email', {
          description: 'We sent you a confirmation email. Please confirm your account before logging in.',
        });
        
        // Redirect to login (full page reload)
        window.location.href = '/login';
      } else {
        // If email confirmation is not required, proceed to dashboard
        toast.success('Account created successfully');
        
        // Redirect to dashboard (full page reload)
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error("Signup onSubmit error:", error);
      toast.error('Something went wrong during signup', {
        description: 'Please try again later',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);

    try {
      await signInWithGoogle();
      // Note: Redirect happens automatically after OAuth
    } catch (error) {
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
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              type="text"
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect="off"
              disabled={isLoading}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              disabled={isLoading}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="yearOfStudy">Year of Study (Optional)</Label>
            <Input
              id="yearOfStudy"
              placeholder="e.g. Freshman, Sophomore, Junior, Senior"
              type="text"
              disabled={isLoading}
              {...register('yearOfStudy')}
            />
            {errors.yearOfStudy && (
              <p className="text-sm text-red-500">{errors.yearOfStudy.message}</p>
            )}
          </div>
          <Button disabled={isLoading} type="submit">
            {isLoading && (
              <Spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Sign Up
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
        Already have an account?{' '}
        <Button 
          variant="link" 
          className="p-0 h-auto" 
          onClick={() => {
            try {
              router.push('/login');
            } catch (err) {
              console.error('Router navigation failed, using fallback', err);
              window.location.href = '/login';
            }
          }}
        >
          <span className="underline">Sign in</span>
        </Button>
      </p>
    </div>
  );
}
