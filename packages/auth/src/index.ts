import { client } from "@we-grow/db";
import { env } from "@we-grow/env/server";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { UserProfile } from "@we-grow/db/models/index";
import { generateId } from "@we-grow/db/utils/id";

export const auth = betterAuth({
  database: mongodbAdapter(client),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      enabled: env.GOOGLE_CLIENT_ID !== undefined && env.GOOGLE_CLIENT_SECRET !== undefined,
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
    },
  },
  plugins: [nextCookies()],
  user: {
    onCreate: async (user) => {
      const now = new Date();
      await UserProfile.create({
        _id: generateId(),
        userId: user.id,
        goals: [],
        timezone: "UTC",
        onboardingCompleted: false,
        totalXp: 0,
        level: 1,
        createdAt: now,
        updatedAt: now,
      });
    },
  },
});
