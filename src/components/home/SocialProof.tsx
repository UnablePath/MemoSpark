'use client';

import React from 'react';
import { Star, Users, BookOpen, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  description?: string;
}

const Stat: React.FC<StatProps> = ({ icon, value, label, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="flex flex-col items-center text-center p-4"
  >
    <div className="mb-3 text-green-400">
      {icon}
    </div>
    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
      {value}
    </div>
    <div className="text-sm md:text-base text-muted-foreground">
      {label}
    </div>
    {description && (
      <div className="text-xs text-muted-foreground/80 mt-1">
        {description}
      </div>
    )}
  </motion.div>
);

interface TestimonialProps {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar?: string;
}

const Testimonial: React.FC<TestimonialProps> = ({ name, role, content, rating }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
    viewport={{ once: true }}
    className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
  >
    <div className="flex items-center mb-4">
      <div className="flex text-yellow-400 text-sm">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-current' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
    <blockquote className="text-white mb-4 text-sm md:text-base">
      "{content}"
    </blockquote>
    <div className="flex items-center">
      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
        {name.charAt(0)}
      </div>
      <div>
        <div className="text-white font-medium text-sm">{name}</div>
        <div className="text-muted-foreground text-xs">{role}</div>
      </div>
    </div>
  </motion.div>
);

export const SocialProof: React.FC = () => {
  const stats = [
    {
      icon: <Users className="w-8 h-8" />,
      value: "10K+",
      label: "Active Students",
      description: "Join our growing community"
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      value: "50K+",
      label: "Tasks Completed",
      description: "Productivity achievements unlocked"
    },
    {
      icon: <Trophy className="w-8 h-8" />,
      value: "95%",
      label: "Success Rate",
      description: "Students improve their grades"
    },
    {
      icon: <Star className="w-8 h-8" />,
      value: "4.9",
      label: "App Rating",
      description: "Loved by students worldwide"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      content: "MemoSpark completely transformed how I manage my coursework. The AI suggestions are spot-on and I never miss deadlines anymore!",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Graduate Student",
      content: "The gamification aspect keeps me motivated. I've earned over 500 coins and my productivity has increased by 40%!",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "High School Senior",
      content: "Finally, an app that understands student life! The stress relief features and smart scheduling are game-changers.",
      rating: 5
    }
  ];

  return (
    <div className="w-full">
      {/* Stats Section */}
      <div className="py-16 bg-black/20 border-y border-white/5">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Trusted by Students Worldwide
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of students who have already transformed their study habits with MemoSpark
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Stat key={index} {...stat} />
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-16 bg-black/10">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              What Students Are Saying
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real feedback from students who've experienced the MemoSpark difference
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Testimonial key={index} {...testimonial} />
            ))}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="py-8 bg-black/5 border-t border-white/5">
        <div className="responsive-container">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-center gap-8 text-center"
          >
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Privacy Protected</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>24/7 Support</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
