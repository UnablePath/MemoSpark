"use client";

import { useRouter } from "next/navigation";
import { useUser } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaCog, FaUser, FaSignOutAlt } from "react-icons/fa";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { useClerk } from '@clerk/nextjs';

export const ProfileHeader = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
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

  // Handle navigation to full profile page
  const handleNavigateToProfile = () => {
    router.push("/profile");
  };

  // Handle navigation to full settings page
  const handleNavigateToSettings = () => {
    router.push("/settings");
  };

  // Handle Sign Out
  const handleSignOut = () => {
    signOut();
  };

  if (!isLoaded) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full h-10 w-10 p-0" aria-label="Open user menu">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.imageUrl} alt={user.fullName || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.fullName || "User")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{user.fullName || "Your Account"}</p>
            <p className="text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Quick Profile Modal */}
        <ProfileModal>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            <FaUser className="mr-2 h-4 w-4" aria-hidden="true" />
            Quick Profile
          </DropdownMenuItem>
        </ProfileModal>

        {/* Quick Settings Modal */}
        <SettingsModal>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
            <FaCog className="mr-2 h-4 w-4" aria-hidden="true" />
            Quick Settings
          </DropdownMenuItem>
        </SettingsModal>

        <DropdownMenuSeparator />
        
        {/* Full page links */}
        <DropdownMenuItem onClick={handleNavigateToProfile} className="cursor-pointer">
          <FaUser className="mr-2 h-4 w-4" aria-hidden="true" />
          Full Profile Page
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleNavigateToSettings} className="cursor-pointer">
          <FaCog className="mr-2 h-4 w-4" aria-hidden="true" />
          Full Settings Page
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <FaSignOutAlt className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileHeader;
