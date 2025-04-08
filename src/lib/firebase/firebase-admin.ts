import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // Check if we're running in a production environment with actual secrets
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        // We need to replace the escaped new line characters with actual new lines
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_ADMIN_STORAGE_BUCKET,
    });
  } else {
    // For development, we can use a service account key file
    try {
      // Try to initialize with a direct import or a mock setup for development
      const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studyspark-dev",
        clientEmail: "firebase-adminsdk-mock@studyspark-dev.iam.gserviceaccount.com",
        privateKey: "mock-key-for-development-only",
      };

      initializeApp({
        credential: cert(serviceAccount as any),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
      console.info("Firebase Admin initialized with development configuration");
    } catch (error) {
      console.error("Failed to initialize Firebase Admin:", error);
    }
  }
}

// Export the admin services
export const adminDb = getFirestore();
export const adminAuth = getAuth();
export const adminStorage = getStorage();
