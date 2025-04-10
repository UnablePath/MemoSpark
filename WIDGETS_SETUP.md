# Setting Up Mobile Widgets with expo-apple-targets

This guide provides step-by-step instructions for implementing iOS widgets for StudySpark using expo-apple-targets.

## 1. Creating the Expo Mobile App

### Initial Setup

1. Create a new Expo project:
   ```bash
   npx create-expo-app@latest StudySpark-mobile -t blank-typescript
   ```

2. Navigate to the project:
   ```bash
   cd StudySpark-mobile
   ```

3. Install necessary dependencies:
   ```bash
   npx expo install expo-apple-targets expo-linking expo-dev-client
   npm install @supabase/supabase-js date-fns axios
   ```

## 2. Configuring expo-apple-targets

### Install Apple Developer Tools

1. Make sure you have Xcode installed (for iOS development).
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```

### Project Configuration

1. Create an `app.json` configuration:

```json
{
  "expo": {
    "name": "StudySpark",
    "slug": "studyspark",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#22c55e"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourdomain.studyspark"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#22c55e"
      },
      "package": "com.yourdomain.studyspark"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-apple-targets"
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

2. Create the widget configuration:

Create a file called `widget-extension.json` at the root of your project:

```json
{
  "targets": [
    {
      "name": "StudySparkWidget",
      "type": "widget-extension",
      "bundleIdentifier": "com.yourdomain.studyspark.widget",
      "deploymentTarget": "16.0",
      "infoPlist": {
        "NSExtension": {
          "NSExtensionPointIdentifier": "com.apple.widgetkit-extension",
          "NSExtensionPrincipalClass": "$(PRODUCT_MODULE_NAME).StudySparkWidget"
        }
      },
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourdomain.studyspark.widget"
        ]
      }
    }
  ]
}
```

3. Initialize the widgets:

```bash
npx expo prebuild --platform ios
```

## 3. Creating Widget Implementation

Create a new directory called `widgets` in your project root:

```bash
mkdir -p widgets/StudySparkWidget
```

### Widget Entry Point

Create a file called `widgets/StudySparkWidget/StudySparkWidget.swift`:

```swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry(date: Date(), priority: "high", title: "Math Assignment", dueDate: "Today")
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> ()) {
        let entry = TaskEntry(date: Date(), priority: "high", title: "Math Assignment", dueDate: "Today")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Get task data from shared UserDefaults
        let userDefaults = UserDefaults(suiteName: "group.com.yourdomain.studyspark.widget")

        var taskTitle = "No urgent tasks"
        var taskPriority = "none"
        var taskDueDate = "All caught up!"

        if let storedTitle = userDefaults?.string(forKey: "taskTitle") {
            taskTitle = storedTitle
        }

        if let storedPriority = userDefaults?.string(forKey: "taskPriority") {
            taskPriority = storedPriority
        }

        if let storedDueDate = userDefaults?.string(forKey: "taskDueDate") {
            taskDueDate = storedDueDate
        }

        let entry = TaskEntry(
            date: Date(),
            priority: taskPriority,
            title: taskTitle,
            dueDate: taskDueDate
        )

        // Update every hour
        let nextUpdateDate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdateDate))
        completion(timeline)
    }
}

struct TaskEntry: TimelineEntry {
    let date: Date
    let priority: String
    let title: String
    let dueDate: String
}

struct StudySparkWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var priorityColor: Color {
        switch entry.priority {
        case "high":
            return Color.red
        case "medium":
            return Color.yellow
        case "low":
            return Color.green
        default:
            return Color.gray
        }
    }

    var body: some View {
        ZStack {
            Color(red: 0.13, green: 0.77, blue: 0.37) // Green
                .edgesIgnoringSafeArea(.all)

            VStack(alignment: .center, spacing: 8) {
                if family == .systemSmall {
                    // Small widget layout
                    Circle()
                        .frame(width: 40, height: 40)
                        .foregroundColor(.white)
                        .overlay(
                            Text("🐨")
                                .font(.system(size: 24))
                        )

                    Text(entry.title)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)

                    Text(entry.dueDate)
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.8))

                    Circle()
                        .frame(width: 8, height: 8)
                        .foregroundColor(priorityColor)
                } else {
                    // Medium widget layout
                    HStack(spacing: 12) {
                        Circle()
                            .frame(width: 50, height: 50)
                            .foregroundColor(.white)
                            .overlay(
                                Text("🐨")
                                    .font(.system(size: 30))
                            )

                        VStack(alignment: .leading, spacing: 4) {
                            Text("StudySpark")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(.white.opacity(0.7))

                            Text(entry.title)
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .lineLimit(2)

                            HStack {
                                Text(entry.dueDate)
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.8))

                                Circle()
                                    .frame(width: 10, height: 10)
                                    .foregroundColor(priorityColor)
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding()
        }
    }
}

@main
struct StudySparkWidget: Widget {
    let kind: String = "StudySparkWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StudySparkWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("StudySpark")
        .description("See your most urgent study task.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct StudySparkWidget_Previews: PreviewProvider {
    static var previews: some View {
        StudySparkWidgetEntryView(entry: TaskEntry(date: Date(), priority: "high", title: "Math Assignment", dueDate: "Today"))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
```

## 4. Integrating in React Native Expo App

Create a helper function to update widget data:

```typescript
// src/utils/widgetHelper.ts
import * as AppleTargets from 'expo-apple-targets';
import * as FileSystem from 'expo-file-system';

// Interface for task data
interface TaskData {
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low' | 'none';
}

// Function to update the widget data
export const updateWidgetData = async (task: TaskData | null): Promise<boolean> => {
  try {
    // Default values if no task is provided
    const widgetData = {
      taskTitle: task?.title || 'No urgent tasks',
      taskDueDate: task?.dueDate || 'All caught up!',
      taskPriority: task?.priority || 'none',
    };

    // Use UserDefaults to share data with the widget
    await AppleTargets.UserDefaults.set({
      suiteName: 'group.com.yourdomain.studyspark.widget',
      values: widgetData,
    });

    // Reload all widgets to reflect the new data
    await AppleTargets.Widget.reloadAllTimelines();

    return true;
  } catch (error) {
    console.error('Failed to update widget data:', error);
    return false;
  }
};
```

## 5. Integrating with Supabase

Create a service to fetch the most urgent task for the widget:

```typescript
// src/services/taskService.ts
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { updateWidgetData } from '../utils/widgetHelper';

export const fetchMostUrgentTaskForWidget = async (): Promise<void> => {
  try {
    const user = supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Fetch uncompleted tasks ordered by due date and priority
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .order('due_date', { ascending: true })
      .order('priority', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (tasks && tasks.length > 0) {
      const mostUrgentTask = tasks[0];

      // Format the date for display
      const dueDate = new Date(mostUrgentTask.due_date);
      const formattedDate = format(dueDate, 'MMM d');

      // Update the widget with the most urgent task
      await updateWidgetData({
        title: mostUrgentTask.title,
        dueDate: formattedDate,
        priority: mostUrgentTask.priority,
      });
    } else {
      // No tasks, clear the widget
      await updateWidgetData(null);
    }
  } catch (error) {
    console.error('Failed to fetch task for widget:', error);
  }
};

// Schedule regular updates for the widget
export const scheduleWidgetUpdates = (): NodeJS.Timeout => {
  // Fetch immediately on app start
  fetchMostUrgentTaskForWidget();

  // Then update every 15 minutes
  return setInterval(fetchMostUrgentTaskForWidget, 15 * 60 * 1000);
};
```

## 6. Setting Up Deep Links

Create handler for deep links from the widget:

```typescript
// src/utils/deepLinkHandler.ts
import * as Linking from 'expo-linking';
import { navigate } from '../navigation/RootNavigation';

export const setupDeepLinkHandler = (): void => {
  // Set up deep link listener
  Linking.addEventListener('url', ({ url }) => {
    const { path, queryParams } = Linking.parse(url);

    // Handle deep links based on path
    switch (path) {
      case 'task':
        if (queryParams?.id) {
          navigate('TaskDetail', { taskId: queryParams.id });
        } else {
          navigate('Tasks');
        }
        break;

      case 'reminder':
        navigate('Reminders');
        break;

      default:
        navigate('Home');
        break;
    }
  });
};
```

## 7. Adding Widget Configuration in App Settings

Create a settings screen for widget configuration:

```tsx
// src/screens/WidgetSettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { fetchMostUrgentTaskForWidget } from '../services/taskService';
import { Button } from '../components/Button';

export default function WidgetSettingsScreen() {
  const [autoUpdate, setAutoUpdate] = useState(true);

  const handleToggleAutoUpdate = (value: boolean) => {
    setAutoUpdate(value);
    // Save preference
    // In a real app, save this to AsyncStorage or similar
  };

  const handleManualUpdate = async () => {
    await fetchMostUrgentTaskForWidget();
    // Show success message
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Widget Settings</Text>

      <View style={styles.settingRow}>
        <View>
          <Text style={styles.settingTitle}>Auto-update widget</Text>
          <Text style={styles.settingDescription}>
            Automatically update widgets with your most urgent task
          </Text>
        </View>
        <Switch
          value={autoUpdate}
          onValueChange={handleToggleAutoUpdate}
          trackColor={{ false: '#767577', true: '#22c55e' }}
        />
      </View>

      <Button
        title="Update Widget Now"
        onPress={handleManualUpdate}
        style={styles.updateButton}
      />

      <Text style={styles.helpText}>
        The StudySpark widget shows your most urgent task on your home screen.
        Add it to your home screen by long-pressing and selecting "Edit Home Screen",
        then tapping the "+" icon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    maxWidth: '80%',
  },
  updateButton: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
  },
  helpText: {
    marginTop: 32,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
```

## 8. Testing the Widget

1. Build and run the app on a simulator or device:
   ```bash
   npx expo run:ios
   ```

2. Add the widget to your home screen (on the simulator or device):
   - Long press on the home screen
   - Select "Edit Home Screen"
   - Tap the "+" icon in the top left corner
   - Search for "StudySpark"
   - Select and add the widget

3. The widget should display the most urgent task from your Supabase database.

## 9. Building for Production

1. Configure EAS Build:
   ```bash
   npx eas-cli build:configure
   ```

2. Create a production build profile in `eas.json`:
   ```json
   {
     "cli": {
       "version": ">= 0.60.0"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal"
       },
       "preview": {
         "distribution": "internal"
       },
       "production": {}
     },
     "submit": {
       "production": {}
     }
   }
   ```

3. Build for iOS:
   ```bash
   npx eas build --platform ios --profile production
   ```

## Troubleshooting

### Common Issues:

1. **Widget doesn't update**: Ensure you're using the correct `suiteName` for UserDefaults and that your app and widget extension are in the same App Group.

2. **Missing data**: Check that data is correctly being passed from the app to the widget via UserDefaults.

3. **Build errors**: Make sure Xcode is up to date and you have the proper developer account set up.

4. **Deep link issues**: Verify your app's URL scheme configuration in the app.json file.

### Debug Tips:

- Use `console.log` in your React Native app to track data flow
- For Swift code, add `print` statements to debug the widget
- Check the Xcode console for widget-specific errors
- Verify that the app and widget are both using the same data format

## Next Steps

- Create different widget styles for different priorities
- Add more widget sizes (large size with multiple tasks)
- Implement Android widgets using Glance API
- Add widget tapping actions to mark tasks as complete directly from the widget

With these steps, you'll have a functional iOS widget for StudySpark that displays the most urgent task and updates regularly with data from your Supabase backend.
