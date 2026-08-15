import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { authAccounts, sessions, users, verifications } from "@/server/db/schema";
import { getDatabase } from "@/server/db/client";
import { getServerEnvironment } from "@/server/env";

const environment = getServerEnvironment();

export const auth = betterAuth({
  baseURL: environment.BETTER_AUTH_URL,
  secret: environment.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDatabase(), {
    provider: "pg",
    schema: {
      users,
      sessions,
      auth_accounts: authAccounts,
      verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    deleteUser: {
      enabled: true,
    },
  },
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "auth_accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      idToken: "id_token",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  advanced: {
    cookies: {
      session_token: { name: "lankacalc.session" },
    },
  },
});

export const sessionCookieName = "lankacalc.session";

export type AuthenticatedSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getSessionUser(
  headers: Headers,
): Promise<AuthenticatedSession | null> {
  return auth.api.getSession({ headers });
}
