import NextAuth from "next-auth";
import { FirebaseAdapter } from "@auth/firebase-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase-config";
import { adminDb } from "@/lib/firebase/firebase-admin";

// Configure NextAuth
export const { handlers, auth: nextAuthHandler, signIn, signOut } = NextAuth({
  adapter: FirebaseAdapter(adminDb),
  providers: [
    // Google login provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // Email/Password login provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        try {
          // Use Firebase Authentication to sign in
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );

          const user = userCredential.user;

          if (!user.emailVerified) {
            throw new Error("Email not verified. Please check your inbox.");
          }

          return {
            id: user.uid,
            name: user.displayName,
            email: user.email,
            image: user.photoURL,
          };
        } catch (error: any) {
          if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
            throw new Error("Invalid email or password");
          }
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
    newUser: "/onboarding",
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
});

// Handle NextAuth requests
export { handlers as GET, handlers as POST };
