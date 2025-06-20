'use server';

import { clerkClient } from '@clerk/nextjs/server';

export async function updateUserMetadataAction(userId: string, newMetadata: Record<string, any>) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const updatedMetadata = { ...user.publicMetadata, ...newMetadata };

    await client.users.updateUser(userId, {
      publicMetadata: updatedMetadata,
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return { success: false, error: 'Failed to update user metadata.' };
  }
} 