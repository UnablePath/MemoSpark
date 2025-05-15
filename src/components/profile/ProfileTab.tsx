"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { FaUser, FaGraduationCap, FaBook, FaHeart } from "react-icons/fa";

// Define the user profile type
interface UserProfile {
  name: string;
  email: string;
  yearOfStudy: string;
  subjects: string[];
  interests: string[];
  avatar?: string | null;
}

const defaultProfile: UserProfile = {
  name: "",
  email: "",
  yearOfStudy: "Freshman",
  subjects: [],
  interests: [],
  avatar: null,
};

const ProfileTab = () => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [subjectsInput, setSubjectsInput] = useState("");
  const [interestsInput, setInterestsInput] = useState("");

  // Load profile from localStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("studyspark_profile");
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);

        // Update input fields for subjects and interests
        setSubjectsInput(parsedProfile.subjects.join(", "));
        setInterestsInput(parsedProfile.interests.join(", "));
      } catch (error) {
        console.error("Error parsing saved profile:", error);
      }
    }
  }, []);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle subjects and interests input changes
  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'subjects' | 'interests') => {
    const value = e.target.value;
    if (type === 'subjects') {
      setSubjectsInput(value);
    } else {
      setInterestsInput(value);
    }
  };

  // Convert comma-separated string to array and update profile
  const processArrayInput = () => {
    const subjects = subjectsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const interests = interestsInput
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    setProfile((prev) => ({
      ...prev,
      subjects,
      interests,
    }));

    return { subjects, interests };
  };

  // Handle save profile
  const handleSaveProfile = () => {
    if (!profile.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!profile.email.trim() || !profile.email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Process arrays before saving
    const { subjects, interests } = processArrayInput();

    const updatedProfile = {
      ...profile,
      subjects,
      interests,
    };

    // Save to localStorage
    localStorage.setItem("studyspark_profile", JSON.stringify(updatedProfile));

    setProfile(updatedProfile);
    setIsEditing(false);
    toast.success("Profile updated successfully");
  };

  // Start editing profile
  const handleEditProfile = () => {
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    // Reload the saved profile
    const savedProfile = localStorage.getItem("studyspark_profile");
    if (savedProfile) {
      const parsedProfile = JSON.parse(savedProfile);
      setProfile(parsedProfile);
      setSubjectsInput(parsedProfile.subjects.join(", "));
      setInterestsInput(parsedProfile.interests.join(", "));
    } else {
      setProfile(defaultProfile);
      setSubjectsInput("");
      setInterestsInput("");
    }

    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Profile</h1>
        {!isEditing && (
          <Button onClick={handleEditProfile}>
            Edit Profile
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center">
            <Avatar className="h-16 w-16 mr-4">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile.name || "New User"}</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center">
                  <FaUser className="mr-2 h-4 w-4" /> Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <FaUser className="mr-2 h-4 w-4" /> Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearOfStudy" className="flex items-center">
                  <FaGraduationCap className="mr-2 h-4 w-4" /> Year of Study
                </Label>
                <select
                  id="yearOfStudy"
                  name="yearOfStudy"
                  value={profile.yearOfStudy}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 h-10"
                >
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjects" className="flex items-center">
                  <FaBook className="mr-2 h-4 w-4" /> Subjects (comma separated)
                </Label>
                <Input
                  id="subjects"
                  name="subjects"
                  value={subjectsInput}
                  onChange={(e) => handleArrayInputChange(e, 'subjects')}
                  placeholder="E.g. Mathematics, Physics, Computer Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests" className="flex items-center">
                  <FaHeart className="mr-2 h-4 w-4" /> Interests (comma separated)
                </Label>
                <Input
                  id="interests"
                  name="interests"
                  value={interestsInput}
                  onChange={(e) => handleArrayInputChange(e, 'interests')}
                  placeholder="E.g. Reading, Chess, Programming"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center text-muted-foreground">
                  <FaGraduationCap className="mr-2 h-4 w-4" />
                  <span>Year of Study</span>
                </div>
                <p className="font-medium">{profile.yearOfStudy || "Not specified"}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground">
                  <FaBook className="mr-2 h-4 w-4" />
                  <span>Subjects</span>
                </div>
                {profile.subjects && profile.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.map((subject, index) => (
                      <span
                        key={index}
                        className="bg-secondary text-secondary-foreground text-sm rounded-full px-3 py-1"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No subjects added yet</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-muted-foreground">
                  <FaHeart className="mr-2 h-4 w-4" />
                  <span>Interests</span>
                </div>
                {profile.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="bg-primary/10 text-primary text-sm rounded-full px-3 py-1"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No interests added yet</p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        {isEditing && (
          <CardFooter className="flex justify-end gap-3 pt-0">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>
              Save Profile
            </Button>
          </CardFooter>
        )}
      </Card>

      {!profile.name && !isEditing && (
        <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg mt-4">
          <p className="text-muted-foreground mb-4 text-center">
            Complete your profile to get personalized recommendations and connect with other students.
          </p>
          <Button onClick={handleEditProfile}>
            Set Up Profile
          </Button>
        </div>
      )}

      <div className="mt-auto pt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Your profile information is currently stored only on this device. In the future, connecting an account will allow your data to be securely stored and accessible across devices.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileTab;
