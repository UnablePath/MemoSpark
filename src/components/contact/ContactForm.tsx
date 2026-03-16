'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ContactFormProps {
  supportEmail: string;
}

export const ContactForm: React.FC<ContactFormProps> = ({ supportEmail }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mailtoHref = useMemo(() => {
    const subject = encodeURIComponent(`MemoSpark support: ${name || 'Message'}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
    );
    return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  }, [email, message, name, supportEmail]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      window.location.href = mailtoHref;
      toast.success('Ready to send', {
        description: 'Your email app should open with the message pre-filled.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-sm text-white/70">
          Name
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 border-white/10 bg-black/20 text-white placeholder:text-white/25"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email" className="text-sm text-white/70">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 border-white/10 bg-black/20 text-white placeholder:text-white/25"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message" className="text-sm text-white/70">
          Message
        </Label>
        <Textarea
          id="message"
          placeholder="What can we help with?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="min-h-[140px] resize-none border-white/10 bg-black/20 text-white placeholder:text-white/25"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/35">
          Or email us directly at{' '}
          <a className="text-white/60 underline-offset-4 hover:underline" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 bg-white font-semibold text-black hover:bg-white/90"
        >
          {isSubmitting ? 'Opening email…' : 'Send'}
        </Button>
      </div>
    </form>
  );
};

