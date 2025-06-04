'use client';

import { HomepageNavbar } from "@/components/layout/HomepageNavbar";

export default function AboutPage() {
  return (
    <>
      <HomepageNavbar />
      <main className="pt-16 min-h-screen">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-primary">About MemoSpark</h1>
          <div className="prose lg:prose-xl dark:prose-invert max-w-none">
            <p>
              Welcome to MemoSpark, your ultimate study companion designed to revolutionize the way you learn and manage your academic life.
            </p>
            <p>
              Our mission is to empower students of all levels by providing an innovative platform that combines smart task management, 
              collaborative features, and engaging gamified reminders. We believe that learning should be an enjoyable and rewarding 
              experience, and MemoSpark is built to make that a reality.
            </p>
            <h2 className="text-2xl font-semibold mt-8 mb-4">Our Vision</h2>
            <p>
              We envision a world where every student has the tools and motivation to achieve their full academic potential. 
              MemoSpark aims to be at the forefront of educational technology, continuously evolving to meet the dynamic needs of learners.
            </p>
                          <h2 className="text-2xl font-semibold mt-8 mb-4">Why MemoSpark?</h2>
            <ul>
              <li><strong>Gamified Learning:</strong> Earn points, unlock achievements, and stay motivated on your study journey.</li>
              <li><strong>Smart Scheduling:</strong> Plan your study sessions effectively with intelligent tools and personalized recommendations.</li>
              <li><strong>Progress Tracking:</strong> Monitor your academic progress, identify strengths, and pinpoint areas for improvement.</li>
              <li><strong>Collaborative Study:</strong> Connect with peers, form study groups, and learn together in a supportive environment. (Coming Soon!)</li>
              <li><strong>Personalized Reminders:</strong> Stay on top of your tasks with customizable reminders that fit your unique study habits.</li>
            </ul>
            <p className="mt-6">
              MemoSpark is more than just an app; it's a partner in your educational journey. We are committed to helping you spark your curiosity, 
              ignite your passion for learning, and achieve academic excellence.
            </p>
            <p className="mt-4">
              Thank you for choosing MemoSpark. Let's make learning an adventure!
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 