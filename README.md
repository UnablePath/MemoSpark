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

- Node.js 18+
- **pnpm** (recommended) or **Bun** — this repo ships `pnpm-lock.yaml` and `bun.lock`, not `package-lock.json`
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/memospark.git
cd memospark
```

2. Install dependencies (pick one):

```bash
# Recommended — matches pnpm-lock.yaml
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm install
```

```bash
# Alternative
bun install
```

**Do not use `npm install` as your only tool** on this project: npm resolves a different tree than pnpm and can fail with `EUNSUPPORTEDPROTOCOL` / `workspace:*` when a dependency expects a workspace-aware client. If you already ran `npm install`, delete `node_modules` and install again with **pnpm** or **bun**.

3. Start the development server:
```bash
pnpm dev
# or: bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### E2E tests (Playwright)

```bash
pnpm exec playwright install
pnpm run test:e2e
```

With the dev server already running: `set PLAYWRIGHT_NO_SERVER=1` (Windows) or `PLAYWRIGHT_NO_SERVER=1` (Unix) so Playwright does not try to start a second server.

**Onboarding wizard tests** (`e2e/onboarding.spec.ts`) exercise validation and navigation when you’re signed in with **incomplete** onboarding. Anonymous runs skip those cases. To run them locally, sign in once and save storage, then:

```bash
set E2E_STORAGE_STATE=e2e\auth.json
set PLAYWRIGHT_NO_SERVER=1
pnpm exec playwright test e2e/onboarding.spec.ts
```

(Create `e2e/auth.json` with `pnpm exec playwright codegen http://localhost:3000` → sign in → save storage, or use Clerk’s testing helpers.)

**Full submit to `/questionnaire`:** set `E2E_ONBOARDING_FULL=1` (still needs a user that can complete onboarding and working backend).

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

After sign-in, new users complete the **profile wizard** at **`/onboarding`** (year of study, subjects, interests, and related fields). The old **`/clerk-onboarding`** URL is not a route; use **`/onboarding`**. Optional next step: the **AI questionnaire** at `/questionnaire` (often linked from the wizard with `?from=onboarding`). The **Welcome** modal on the dashboard can reflect subjects stored in Clerk **`publicMetadata.subjects`** after onboarding.

**Clerk:** set `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` to `/onboarding` (or another URL your middleware allows) so SSO and email users hit the gate consistently. The JWT template must expose `publicMetadata` as session **`metadata`** so middleware can read `metadata.onboardingComplete`.

**E2E:** see the **E2E tests (Playwright)** section above.

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
