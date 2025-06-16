import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MemoSpark - AI-Powered Student Productivity',
    short_name: 'MemoSpark',
    description: 'Transform your study routine with AI-powered task management, smart scheduling, and gamified progress tracking',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#fadbdb',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['education', 'productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-256x256.png', 
        sizes: '256x256',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-384x384.png',
        sizes: '384x384', 
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'View your tasks and progress',
        url: '/dashboard',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Add Task',
        short_name: 'Add Task', 
        description: 'Create a new task',
        url: '/dashboard?action=add-task',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      },
      {
        name: 'Stress Relief',
        short_name: 'Crashout',
        description: 'Access stress relief tools',
        url: '/dashboard/crashout',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192' }]
      }
    ]
  }
} 