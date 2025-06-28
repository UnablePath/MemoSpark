'use client';

import { HomepageNavbar } from "@/components/layout/HomepageNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { PageSeo } from '@/components/seo/PageSeo';
import { pageSeoConfigs } from '@/lib/seo/seoConfig';
import { AIStructuredData } from '@/components/seo/AIOptimizedMeta';
import { organizationSchema } from '@/lib/seo/structuredData';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    console.log("Contact form submission:", { name, email, message });
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success("Message Sent!", {
      description: "Thank you for contacting us. We'll get back to you soon.",
    });
    setName('');
    setEmail('');
    setMessage('');
  };

  // Generate structured data for contact page - focus on organization and contact info
  const structuredDataSchemas = [organizationSchema];

  return (
    <>
      <PageSeo
        title={pageSeoConfigs.contact.title}
        description={pageSeoConfigs.contact.description}
        canonical={pageSeoConfigs.contact.canonical}
      />
      <AIStructuredData schemas={structuredDataSchemas} />
      <HomepageNavbar />
      <main className="pt-16 min-h-screen">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-primary text-center">Contact Us</h1>
          <div className="max-w-xl mx-auto bg-card p-6 sm:p-8 rounded-xl shadow-xl border border-border/60">
            <p className="text-muted-foreground mb-6 text-center">
              Have questions, feedback, or suggestions? We'd love to hear from you! Fill out the form below, and our team will get back to you as soon as possible.
            </p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-base">Full Name</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                  className="h-11 text-base mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-base">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="h-11 text-base mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="message" className="text-base">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required 
                  className="min-h-[120px] text-base resize-none mt-1.5"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
} 