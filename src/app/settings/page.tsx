"use client";

import { useState } from "react";
import { useRouter } from "@/lib/hooks/use-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FaArrowLeft, FaBell, FaUser, FaPalette, FaUniversalAccess, FaShieldAlt } from "react-icons/fa";
import Logo from "@/components/ui/logo";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  // Profile settings state
  const [profile, setProfile] = useState({
    name: "Alex Johnson",
    email: "alex@example.com",
    year: "Sophomore",
    subjects: "Math, Physics, Computer Science",
    interests: "Programming, Chess, Reading",
  });

  // Notification settings state
  const [notifications, setNotifications] = useState({
    enablePush: true,
    enableEmail: false,
    remindersSound: true,
    dailyDigest: true,
    dueDateReminders: true,
  });

  // Appearance settings state
  const [appearance, setAppearance] = useState({
    darkMode: theme === "dark",
    highContrast: false,
    reducedMotion: false,
    fontSize: "medium",
  });

  // Accessibility settings state
  const [accessibility, setAccessibility] = useState({
    screenReader: false,
    largeText: false,
    reduceAnimations: false,
  });

  // Privacy settings state
  const [privacy, setPrivacy] = useState({
    profileVisibility: "all", // all, friends, none
    showTasksToFriends: false,
    showStreakToFriends: true,
    dataCollection: true,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: "profile" | "notifications" | "appearance" | "accessibility" | "privacy"
  ) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    switch (section) {
      case "profile":
        setProfile((prev) => ({ ...prev, [name]: newValue }));
        break;
      case "notifications":
        setNotifications((prev) => ({ ...prev, [name]: newValue }));
        break;
      case "appearance":
        setAppearance((prev) => {
          const newState = { ...prev, [name]: newValue };
          if (name === "darkMode") {
            setTheme(newValue ? "dark" : "light");
          }
          return newState;
        });
        break;
      case "accessibility":
        setAccessibility((prev) => ({ ...prev, [name]: newValue }));
        break;
      case "privacy":
        setPrivacy((prev) => ({ ...prev, [name]: newValue }));
        break;
    }
  };

  const handleSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
    section: "profile" | "appearance" | "privacy"
  ) => {
    const { name, value } = e.target;

    switch (section) {
      case "profile":
        setProfile((prev) => ({ ...prev, [name]: value }));
        break;
      case "appearance":
        setAppearance((prev) => ({ ...prev, [name]: value }));
        break;
      case "privacy":
        setPrivacy((prev) => ({ ...prev, [name]: value }));
        break;
    }
  };

  const handleSaveSettings = () => {
    // In a real application, this would save the settings to a database or localStorage
    localStorage.setItem("studyspark_profile", JSON.stringify(profile));
    localStorage.setItem("studyspark_notifications", JSON.stringify(notifications));
    localStorage.setItem("studyspark_appearance", JSON.stringify(appearance));
    localStorage.setItem("studyspark_accessibility", JSON.stringify(accessibility));
    localStorage.setItem("studyspark_privacy", JSON.stringify(privacy));

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex items-center">
        <Button variant="ghost" onClick={() => router.back()} className="mr-2">
          <FaArrowLeft />
        </Button>
        <div className="flex-1 flex items-center">
          <Logo size="sm" className="mr-2" />
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
        <Button onClick={handleSaveSettings}>Save</Button>
      </header>

      {/* Settings Tabs */}
      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="profile" className="flex flex-col items-center py-2">
              <FaUser className="mb-1" />
              <span className="text-xs">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col items-center py-2">
              <FaBell className="mb-1" />
              <span className="text-xs">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex flex-col items-center py-2">
              <FaPalette className="mb-1" />
              <span className="text-xs">Display</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex flex-col items-center py-2">
              <FaUniversalAccess className="mb-1" />
              <span className="text-xs">Access</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex flex-col items-center py-2">
              <FaShieldAlt className="mb-1" />
              <span className="text-xs">Privacy</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={(e) => handleInputChange(e, "profile")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange(e, "profile")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year of Study</Label>
                  <select
                    id="year"
                    name="year"
                    value={profile.year}
                    onChange={(e) => handleSelectChange(e, "profile")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Graduate">Graduate</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects (comma separated)</Label>
                  <Input
                    id="subjects"
                    name="subjects"
                    value={profile.subjects}
                    onChange={(e) => handleInputChange(e, "profile")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interests">Interests (comma separated)</Label>
                  <Input
                    id="interests"
                    name="interests"
                    value={profile.interests}
                    onChange={(e) => handleInputChange(e, "profile")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Push Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
                  </div>
                  <Switch
                    checked={notifications.enablePush}
                    name="enablePush"
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, enablePush: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                  </div>
                  <Switch
                    checked={notifications.enableEmail}
                    name="enableEmail"
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, enableEmail: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Reminder Sounds</h3>
                    <p className="text-sm text-muted-foreground">Play sound with notifications</p>
                  </div>
                  <Switch
                    checked={notifications.remindersSound}
                    name="remindersSound"
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, remindersSound: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Daily Digest</h3>
                    <p className="text-sm text-muted-foreground">Get a summary of your tasks each morning</p>
                  </div>
                  <Switch
                    checked={notifications.dailyDigest}
                    name="dailyDigest"
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, dailyDigest: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Due Date Reminders</h3>
                    <p className="text-sm text-muted-foreground">Get reminders before tasks are due</p>
                  </div>
                  <Switch
                    checked={notifications.dueDateReminders}
                    name="dueDateReminders"
                    onCheckedChange={(checked) =>
                      setNotifications(prev => ({ ...prev, dueDateReminders: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize how StudySpark looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-muted-foreground">Use dark theme for the application</p>
                  </div>
                  <Switch
                    checked={appearance.darkMode}
                    name="darkMode"
                    onCheckedChange={(checked) => {
                      setAppearance(prev => ({ ...prev, darkMode: checked }));
                      setTheme(checked ? "dark" : "light");
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">High Contrast</h3>
                    <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
                  </div>
                  <Switch
                    checked={appearance.highContrast}
                    name="highContrast"
                    onCheckedChange={(checked) =>
                      setAppearance(prev => ({ ...prev, highContrast: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Reduced Motion</h3>
                    <p className="text-sm text-muted-foreground">Minimize animated effects</p>
                  </div>
                  <Switch
                    checked={appearance.reducedMotion}
                    name="reducedMotion"
                    onCheckedChange={(checked) =>
                      setAppearance(prev => ({ ...prev, reducedMotion: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fontSize">Font Size</Label>
                  <select
                    id="fontSize"
                    name="fontSize"
                    value={appearance.fontSize}
                    onChange={(e) => handleSelectChange(e, "appearance")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Settings */}
          <TabsContent value="accessibility">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Settings</CardTitle>
                <CardDescription>Make StudySpark more accessible</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Screen Reader Support</h3>
                    <p className="text-sm text-muted-foreground">Optimize for screen readers</p>
                  </div>
                  <Switch
                    checked={accessibility.screenReader}
                    name="screenReader"
                    onCheckedChange={(checked) =>
                      setAccessibility(prev => ({ ...prev, screenReader: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Large Text</h3>
                    <p className="text-sm text-muted-foreground">Increase text size throughout the app</p>
                  </div>
                  <Switch
                    checked={accessibility.largeText}
                    name="largeText"
                    onCheckedChange={(checked) =>
                      setAccessibility(prev => ({ ...prev, largeText: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Reduce Animations</h3>
                    <p className="text-sm text-muted-foreground">Minimize or remove animations</p>
                  </div>
                  <Switch
                    checked={accessibility.reduceAnimations}
                    name="reduceAnimations"
                    onCheckedChange={(checked) =>
                      setAccessibility(prev => ({ ...prev, reduceAnimations: checked }))
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground mb-2">
                  We are committed to making StudySpark accessible to everyone. If you have suggestions or encounter any issues, please contact our support team.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your data and visibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <select
                    id="profileVisibility"
                    name="profileVisibility"
                    value={privacy.profileVisibility}
                    onChange={(e) => handleSelectChange(e, "privacy")}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="all">All Students</option>
                    <option value="friends">Connected Students Only</option>
                    <option value="none">Private (No One)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Share Tasks with Friends</h3>
                    <p className="text-sm text-muted-foreground">Let connected students see your tasks</p>
                  </div>
                  <Switch
                    checked={privacy.showTasksToFriends}
                    name="showTasksToFriends"
                    onCheckedChange={(checked) =>
                      setPrivacy(prev => ({ ...prev, showTasksToFriends: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Share Streak with Friends</h3>
                    <p className="text-sm text-muted-foreground">Let connected students see your streak progress</p>
                  </div>
                  <Switch
                    checked={privacy.showStreakToFriends}
                    name="showStreakToFriends"
                    onCheckedChange={(checked) =>
                      setPrivacy(prev => ({ ...prev, showStreakToFriends: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Data Collection</h3>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage data collection to improve the app</p>
                  </div>
                  <Switch
                    checked={privacy.dataCollection}
                    name="dataCollection"
                    onCheckedChange={(checked) =>
                      setPrivacy(prev => ({ ...prev, dataCollection: checked }))
                    }
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start">
                <p className="text-sm text-muted-foreground">
                  We take your privacy seriously. Your data is encrypted and never shared with third parties without your consent.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
