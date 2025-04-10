# Deploying StudySpark to Vercel

This guide provides step-by-step instructions for deploying the StudySpark application to Vercel, ensuring compatibility with Supabase and proper environment configuration.

## 1. Preparing Your Application for Deployment

### Update Next.js Configuration

Ensure your `next.config.js` is properly configured for Vercel deployment:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel will handle deployment optimization
  swcMinify: true,
  images: {
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "icons.iconarchive.com",
      // Add any other image domains you use
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    // Only do type checking in development
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },
  eslint: {
    // Only do linting in development
    ignoreDuringBuilds: process.env.NODE_ENV === "production",
  },
};

module.exports = nextConfig;
```

### Create a Vercel Configuration File

Create a `vercel.json` file in the root of your project:

```json
{
  "version": 2,
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; img-src 'self' data: https:; font-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://your-supabase-url.supabase.co;"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

Replace `https://your-supabase-url.supabase.co` with your actual Supabase URL in the Content-Security-Policy.

## 2. Setting Up Vercel CLI

### Installation and Login

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project to Vercel:
   ```bash
   cd studyspark
   vercel link
   ```

### Environment Variables Setup

1. Add your Supabase environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   ```
   Enter your Supabase URL when prompted.

2. Add your Supabase anon key:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   Enter your Supabase anon key when prompted.

3. If you're using other environment variables (e.g., for authentication), add them as well:
   ```bash
   vercel env add NEXTAUTH_URL
   vercel env add NEXTAUTH_SECRET
   ```

## 3. Deploying to Vercel

### Development Deployment

To create a preview deployment:

```bash
vercel
```

This will deploy your application to a preview URL, allowing you to test it before deploying to production.

### Production Deployment

Once you've tested your preview deployment and everything works as expected, deploy to production:

```bash
vercel --prod
```

## 4. Setting Up GitHub Integration

For continuous deployment, connect your GitHub repository to Vercel:

1. Go to [vercel.com](https://vercel.com) and login
2. Click "Add New..." > "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: bun run build
   - Output Directory: .next
5. Add environment variables from your previous setup
6. Click "Deploy"

## 5. Domain Configuration

To use a custom domain:

1. In your Vercel dashboard, navigate to your project
2. Go to "Settings" > "Domains"
3. Add your domain and follow the instructions to configure DNS

## 6. Performance Optimization

### Enabling ISR (Incremental Static Regeneration)

For pages that don't need to be dynamically rendered on every request, use ISR:

```typescript
// In your page component
export async function getStaticProps() {
  // Fetch data from Supabase
  const { data } = await supabase.from("your_table").select("*");

  return {
    props: {
      data,
    },
    // Re-generate at most once per minute
    revalidate: 60,
  };
}
```

### Vercel Analytics

Enable Vercel Analytics to monitor performance:

1. In your Vercel dashboard, go to "Analytics"
2. Click "Enable Analytics"
3. Follow instructions to add the analytics script to your application

## 7. CI/CD with GitHub Actions

Create a GitHub Actions workflow file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Dependencies
        run: bun install

      - name: Run Tests
        run: bun test

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./
          vercel-args: ${{ github.event_name == 'push' && '--prod' || '' }}
```

Add the required secrets to your GitHub repository:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

## 8. Monitoring and Logging

### Setting Up Error Monitoring

1. In your Vercel dashboard, go to "Monitoring"
2. Connect an error monitoring service like Sentry

### Log Management

1. In your Vercel dashboard, go to "Logs"
2. View your application's logs for debugging issues

## 9. Supabase Edge Functions Integration

If you're using Supabase Edge Functions:

1. Update your Next.js API routes to call Supabase Edge Functions:

```typescript
// pages/api/calculateStreak.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { data, error } = await supabase.functions.invoke('calculate-streaks', {
      body: JSON.stringify(req.body),
    });

    if (error) throw error;

    res.status(200).json(data);
  } catch (error) {
    console.error('Error calling Edge Function:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
```

## 10. Vercel Deployment Checks

Vercel automatically performs deployment checks. To add custom checks:

1. Go to your project Settings in the Vercel dashboard
2. Navigate to "Deployment Checks"
3. Add custom deployment checks as needed:
   - Set up health checks
   - Configure maximum duration
   - Set failure policies

## 11. Testing Your Deployment

After deploying, test the following:

1. **Authentication**: Test the login and signup flows
2. **Data operations**: Create, read, update, and delete tasks
3. **Real-time features**: Test any real-time functionality
4. **Mobile responsiveness**: Test on various device sizes
5. **Performance**: Use Lighthouse to analyze performance
6. **Accessibility**: Check WCAG compliance

## Troubleshooting Common Issues

### Application Builds but Fails to Start

Check your environment variables. They may not be properly set in Vercel:

1. Go to Vercel project settings
2. Check "Environment Variables" section
3. Verify all required variables are set

### 404 Errors on Dynamic Routes

This can happen when using dynamic routes with Vercel. Make sure to:

1. Use `getStaticPaths` with fallback mode if appropriate
2. Check your routing configuration in Next.js

### API Routes Not Working

For API routes that interact with Supabase:

1. Check CORS configuration in Supabase
2. Verify your API routes are correctly handling requests
3. Check browser console for any errors

## Conclusion

Your StudySpark application should now be successfully deployed to Vercel with Supabase integration. Remember to:

1. Regularly update your dependencies
2. Monitor application performance
3. Watch for any security advisories
4. Set up automatic backups for your Supabase database

With these steps, your application is production-ready with continuous deployment enabled!
