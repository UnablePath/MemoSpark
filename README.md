# MemoSpark

MemoSpark is a mobile and web-based platform designed to combat student forgetfulness by integrating engagement directly into their digital experience. The app enhances student engagement and time management through an intuitive interface inspired by Snapchat, featuring three primary tabs.

![MemoSpark](public/images/memospark-preview.png)

## Features

### 1. Student Connection
- Social networking for students
- Profile setup and interaction
- Search for students by name or subject
- Chat function with messaging

### 2. Task & Event Input
- Calendar-based task manager
- Add assignments, deadlines, and appointments
- Set priority levels (Low, Medium, High)
- Color-coded events (Green for academics, Beige for personal)

### 3. Gamified Reminders with "Stu" the Talking Koala
- AI-driven, interactive reminders
- "Streaks" system for completing tasks
- Reward system (Coins redeemable for app themes)
- Achievement badges

### Additional Features
- **Draggable Widget**: A locket-style widget that can be repositioned anywhere on screen
- **Interactive Mascot**: Click on Stu to see different animations and messages

## Technologies Used

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **State Management**: React Hooks
- **Storage**: LocalStorage for persistence

## Getting Started

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/memospark.git
cd memospark
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
memospark/
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   ├── home/        # Student connection components
│   │   ├── tasks/       # Task management components
│   │   ├── reminders/   # Reminders and gamification components
│   │   └── ui/          # UI components
│   └── lib/             # Utility functions and shared code
├── package.json         # Project dependencies
└── README.md            # Project documentation
```

## Usage

### Onboarding

The application starts with a splash screen and offers an onboarding process that includes:
1. Account creation (email or Google sign-in)
2. Profile setup (name, year of study, subjects, interests)
3. Welcome tour explaining the app's features

### Dashboard

The main interface features three tabs that can be navigated through swiping (mobile) or clicking (desktop):
1. **Student Connection**: Connect with classmates and chat
2. **Task & Event Input**: Manage assignments and deadlines
3. **Reminders with Stu**: Gamified reminders and rewards

### Widget

The app features a draggable widget that:
- Displays your most urgent task
- Can be moved anywhere on screen
- Persists its position between sessions
- Provides quick access to your tasks

## Deployment

### Building for Production

```bash
bun run build
```

The output will be placed in the `out` directory.

### Deploying to Netlify

The project includes a `netlify.toml` file for easy deployment to Netlify.

1. Install the Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Log in to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
netlify deploy
```

## Future Enhancements

- Integration with Apple Widget system via expo-apple-targets
- Push notifications integration
- Offline support
- Dark mode theme
- Accessibility improvements

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- MemoSpark mascot "Stu" the Koala designed for optimal student engagement
- Inspired by the intuitive UX of social media apps like Snapchat
