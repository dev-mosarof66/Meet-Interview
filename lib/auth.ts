import { betterAuth } from "better-auth";
import { pool } from "./db";

// Only enable a social provider when its credentials are present,
// so the app still builds/runs before you've added OAuth keys.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> =
  {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: pool,
  secret:
    process.env.BETTER_AUTH_SECRET || "dev-secret-change-me-meet-interview",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      onboarded: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      // Google & GitHub verify emails, so it's safe to link them to an
      // existing account with the same email instead of erroring.
      trustedProviders: ["google", "github"],
    },
  },
  socialProviders,
});
