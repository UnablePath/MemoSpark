import React from 'react';
import { SignUp } from '@clerk/nextjs';
import { MemoSparkLogoSvg } from "@/components/ui/MemoSparkLogoSvg";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="flex justify-center">
            <MemoSparkLogoSvg height={50} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your information to get started
          </p>
        </div>
        <SignUp />
      </div>
    </div>
  );
} 