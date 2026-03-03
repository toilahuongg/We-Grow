import { createAuthClient } from "better-auth/react";
import { env } from "@we-grow/env/web";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_BETTER_AUTH_URL,
});
