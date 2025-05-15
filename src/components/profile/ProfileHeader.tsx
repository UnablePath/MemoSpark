"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaCog, FaUser, FaSignOutAlt } from "react-icons/fa";

export const ProfileHeader = () => {
  const { profile, isProfileLoaded, resetProfile } = useUser();
  const router = useRouter();

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Handle navigation to settings
  const handleNavigateToSettings = () => {
    router.push("/settings");
  };

  // Handle navigation to profile page
  const handleNavigateToProfile = () => {
    // Navigate to the dedicated profile page
    router.push("/profile");
  };

  // Handle Sign Out
  const handleSignOut = () => {
    // Clear the profile from local storage upon sign out
    localStorage.removeItem('studyspark_profile');
    // Reset profile state in context so UI updates immediately
    resetProfile();
    router.push('/login'); // Redirect to login
  };

  if (!isProfileLoaded) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full h-10 w-10 p-0" aria-label="Open user menu">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(profile.name || "User")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {profile.name ? profile.name : "Your Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleNavigateToProfile} className="cursor-pointer">
          <FaUser className="mr-2 h-4 w-4" aria-hidden="true" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNavigateToSettings} className="cursor-pointer">
          <FaCog className="mr-2 h-4 w-4" aria-hidden="true" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <FaSignOutAlt className="mr-2 h-4 w-4" aria-hidden="true" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileHeader;
