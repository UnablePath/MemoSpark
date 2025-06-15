'use server';

import { clerkClient } from '@clerk/nextjs/server';

export async function updateUserMetadataAction(userId: string, metadata: Record<string, any>) {
  try {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: metadata,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return { success: false, error: 'Failed to update user metadata.' };
  }
} 