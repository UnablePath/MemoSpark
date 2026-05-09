"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUser } from "@clerk/nextjs";
import { BookOpen, GraduationCap, Heart } from "lucide-react";
import Link from "next/link";

/**
 * Read-only summary for embed/side panels. Authoritative edits live on `/profile`
 * (Supabase + Clerk). Tier F: no duplicate `memospark_profile` identity writes here.
 */
const ProfileTab = () => {
  const { user, isLoaded: clerkLoaded } = useUser();
  const { profile, isLoading, error } = useUserProfile();

  const displayName =
    profile?.full_name ||
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Student";
  const email = profile?.email || user?.primaryEmailAddress?.emailAddress || "";
  const avatarUrl = profile?.avatar_url || user?.imageUrl || undefined;

  const getInitials = (name: string) => {
    if (!name.trim()) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!clerkLoaded || isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not load profile.{" "}
        <Link href="/profile" className="underline">
          Open profile
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Button asChild>
          <Link href="/profile">Edit on full profile</Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <Avatar className="mr-4 h-16 w-16">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{displayName}</CardTitle>
              <CardDescription>{email || "Not added"}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pb-6">
          <div className="space-y-1">
            <div className="flex items-center text-muted-foreground">
              <GraduationCap className="mr-2 h-4 w-4" />
              <span>Year of study</span>
            </div>
            <p className="font-medium">
              {profile?.year_of_study || "Not specified"}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Subjects</span>
            </div>
            {profile?.subjects && profile.subjects.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No subjects yet</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-muted-foreground">
              <Heart className="mr-2 h-4 w-4" />
              <span>Interests</span>
            </div>
            {profile?.interests && profile.interests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="italic text-muted-foreground">No interests yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-auto pt-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Account & data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Profile details are saved to your account. Use the full profile
              page to edit name, subjects, interests, and bio.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileTab;
