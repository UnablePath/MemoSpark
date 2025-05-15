'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export const completeOnboarding = async (formData: FormData) => {
  const { userId } = await auth()

  if (!userId) {
    return { message: 'No Logged In User' }
  }

  // Retrieve data from formData
  const name = formData.get('name') as string || '';
  const email = formData.get('email') as string || ''; // Clerk already has user's email, consider if this is needed here or just for prefill
  const yearOfStudy = formData.get('yearOfStudy') as string || '';
  const birthDate = formData.get('birthDate') as string || null;
  const interests = formData.get('interests') as string || ''; // This will be a comma-separated string

  const client = await clerkClient()

  try {
    const res = await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        // Store the new onboarding fields
        name: name,
        // email: email, // Primary email is already managed by Clerk, avoid overwriting unless specific reason
        yearOfStudy: yearOfStudy,
        birthDate: birthDate, // Stored as 'yyyy-MM-dd' string
        interests: interests.split(/\s*,\s*/).filter(Boolean), // Store as an array of strings
        // Remove old placeholder fields if they are no longer used
        // applicationName: undefined,
        // applicationType: undefined,
      },
    })
    return { message: "Onboarding completed successfully." } // Return a more generic success message or specific data if needed
  } catch (err) {
    console.error("Error updating user metadata for onboarding:", err);
    // It might be useful to inspect the error structure for more specific messages
    let errorMessage = 'There was an error updating your profile.';
    if (err instanceof Error) {
      // todo: check for err.errors[0].message for more specific clerk errors
      // if (err.errors && err.errors[0] && err.errors[0].message) { 
      //  errorMessage = err.errors[0].message;
      //}
    }
    return { error: errorMessage }
  }
} 