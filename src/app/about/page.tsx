'use client';

import { HomepageNavbar } from "@/components/layout/HomepageNavbar";
import { PageSeo } from '@/components/seo/PageSeo';
import { pageSeoConfigs } from '@/lib/seo/seoConfig';
import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { generatePageStructuredData } from '@/lib/seo/structuredData';

export default function AboutPage() {
  // Generate structured data for about page
  const structuredDataSchemas = generatePageStructuredData('about');

  return (
    <>
      <PageSeo
        title={pageSeoConfigs.about.title}
        description={pageSeoConfigs.about.description}
        canonical={pageSeoConfigs.about.canonical}
      />
      <AIStructuredData schemas={structuredDataSchemas} />
      <div className="app-container">
        <HomepageNavbar />
        <main className="pt-16 min-h-screen">
          <div className="responsive-container py-8 md:py-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-primary text-constrain">About MemoSpark</h1>
            <div className="prose lg:prose-xl dark:prose-invert max-w-none safe-scroll-area">
              <p className="text-constrain">
                Welcome to MemoSpark, your ultimate study companion designed to revolutionize the way you learn and manage your academic life.
              </p>
              <p className="text-constrain">
                Our mission is to empower students of all levels by providing an innovative platform that combines smart task management, 
                collaborative features, and engaging gamified reminders. We believe that learning should be an enjoyable and rewarding 
                experience, and MemoSpark is built to make that a reality.
              </p>
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-constrain">Our Vision</h2>
              <p className="text-constrain">
                We envision a world where every student has the tools and motivation to achieve their full academic potential. 
                MemoSpark aims to be at the forefront of educational technology, continuously evolving to meet the dynamic needs of learners.
              </p>
              <h2 className="text-2xl font-semibold mt-8 mb-4 text-constrain">Why MemoSpark?</h2>
              <ul className="space-y-3">
                <li className="text-constrain"><strong>Gamified Learning:</strong> Earn points, unlock achievements, and stay motivated on your study journey.</li>
                <li className="text-constrain"><strong>Smart Scheduling:</strong> Plan your study sessions effectively with intelligent tools and personalized recommendations.</li>
                <li className="text-constrain"><strong>Progress Tracking:</strong> Monitor your academic progress, identify strengths, and pinpoint areas for improvement.</li>
                <li className="text-constrain"><strong>Collaborative Study:</strong> Connect with peers, form study groups, and learn together in a supportive environment. (Coming Soon!)</li>
                <li className="text-constrain"><strong>Personalized Reminders:</strong> Stay on top of your tasks with customizable reminders that fit your unique study habits.</li>
              </ul>
              <p className="mt-6 text-constrain">
                MemoSpark is more than just an app; it's a partner in your educational journey. We are committed to helping you spark your curiosity, 
                ignite your passion for learning, and achieve academic excellence.
              </p>
              <p className="mt-4 text-constrain">
                Thank you for choosing MemoSpark. Let's make learning an adventure!
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 