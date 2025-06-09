import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex justify-center">
            <MemoSparkLogoSvg height={50} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
} 