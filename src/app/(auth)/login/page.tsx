// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

import { Icons } from '@/components/ui/icons';

export const metadata = {
  title: 'Login | StudySpark',
  description: 'Login to your StudySpark account',
};

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.user className="mx-auto h-8 w-8" />
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue (Test Content)
          </p>
        </div>
        <p className="px-8 text-center text-sm text-muted-foreground">
          Terms and Privacy info here.
        </p>
      </div>
    </div>
  );
}
