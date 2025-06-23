import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Masks an email address for privacy protection
 * Shows first 2 characters, masked middle, and domain
 * Example: "john.doe@example.com" -> "jo****@example.com"
 */
export function maskEmail(email: string | null): string {
  if (!email) return '';
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart}***@${domain}`;
  }
  
  const visibleStart = localPart.slice(0, 2);
  const maskedLength = Math.min(localPart.length - 2, 4);
  const masked = '*'.repeat(maskedLength);
  
  return `${visibleStart}${masked}@${domain}`;
}

/**
 * Generates a username from full name and ID for search purposes
 * Example: "John Doe" + "user123" -> "johndoe.user123"
 */
export function generateUsername(fullName: string | null, userId: string): string {
  if (!fullName) return `user.${userId.slice(-8)}`;
  
  const cleanName = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .slice(0, 12); // Limit length
  
  return `${cleanName}.${userId.slice(-6)}`;
}

/**
 * Searches for username patterns in search terms
 * Returns { isUsernameSearch: boolean, cleanTerm: string }
 */
export function parseSearchTerm(searchTerm: string): { isUsernameSearch: boolean; cleanTerm: string } {
  const trimmed = searchTerm.trim();
  if (trimmed.startsWith('@')) {
    return {
      isUsernameSearch: true,
      cleanTerm: trimmed.slice(1).toLowerCase()
    };
  }
  return {
    isUsernameSearch: false,
    cleanTerm: trimmed
  };
}
